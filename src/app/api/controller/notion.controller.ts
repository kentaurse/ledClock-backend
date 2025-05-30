import prisma from "@/prisma/prisma";
import { RESPONSE_CODE, ReqUserObj } from "@/types";
import { nanoid } from "nanoid";
import { NextRequest } from "next/server";
import NotionService from "../services/notion.service";
import HttpException from "../utils/exception";
import { addNotionPageSchema } from "../utils/schema_validation";
import sendResponse from "../utils/sendResponse";
import ZodValidation from "../utils/zodValidation";
import hashnodeService from "../services/hashnode.service";

class NotionController {
  async getArticlesContent(req: NextRequest) {
    const user = (req as any)["user"] as ReqUserObj;
    const integration = await prisma.integration.findFirst({
      where: { userId: user.id },
    });

    const notionService = new NotionService({
      connection_settings: {
        token: integration?.token!,
      },
      options: {
        skip_block_types: [""],
      },
    });

    const notionDB = await notionService.searchDatabase();

    if (!notionDB) {
      throw new HttpException(
        RESPONSE_CODE.NOT_FOUND,
        "Notion database not found. Please make sure you've linked the integration and connected hashmind to your workspace.",
        404
      );
    }

    const posts = await notionService.getDBPosts(notionDB.databaseId);

    const articles = [];
    if (posts.length > 0) {
      for (const p of posts) {
        const pageExists = await prisma.integrationPage.findFirst({
          where: {
            pageId: p.id,
          },
        });

        // @ts-expect-error
        if (p.pageUrl) delete p?.pageUrl;

        articles.push({
          ...p,
          article_id: pageExists?.article_id ?? null,
          type: pageExists?.type,
          author: pageExists?.author,
          hn_cuid: pageExists?.hn_cuid,
          url: pageExists?.pageUrl,
          pageId: pageExists?.pageId,
        });

        if (!pageExists) {
          await prisma.integrationPage.create({
            data: {
              id: nanoid(),
              pageUrl: p.pageUrl,
              userId: user.id,
              pageId: p.id,
              type: "notion",
            },
          });
        } else {
          await prisma.integrationPage.update({
            where: {
              id: pageExists.id,
            },
            data: {
              pageUrl: p.pageUrl,
            },
          });
        }
      }
    }

    // update databaseid
    await prisma.users.update({
      where: {
        userId: user.id,
      },
      data: {
        notion_database_id: notionDB.databaseId!,
      },
    });

    return sendResponse.success(
      RESPONSE_CODE.SUCCESS,
      "Successfully fetched notion pages.",
      200,
      articles
    );
  }

  async syncToHashnode(req: NextRequest) {
    const user = (req as any)["user"] as ReqUserObj;
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      throw new HttpException(
        RESPONSE_CODE.BAD_REQUEST,
        "Page id is missing.",
        400
      );
    }

    const userData = await prisma.users.findFirst({
      where: { userId: user.id },
    });
    const integration = await prisma.integration.findFirst({
      where: { userId: user.id },
    });

    const page = await prisma.integrationPage.findFirst({
      where: {
        pageId,
        userId: user.id,
      },
    });

    const articleId = page?.article_id;

    const pubArt = await hashnodeService.notionTohashnode({
      apiKey: user.hnToken,
      notionToken: integration?.token!,
      publicationId: user.hnPubId,
      type: !articleId ? "CREATE" : "UPDATE",
      article_id: articleId!,
      pageId: page?.pageId!,
      databaseId: userData?.notion_database_id!,
    });

    if (pubArt.data) {
      const { id, author, cuid } = pubArt.data;
      await prisma.integrationPage.update({
        where: { id: page?.id! },
        data: {
          article_id: id,
          hn_cuid: cuid,
          author: author?.username,
        },
      });
      console.log("✅ Integration page updated");
    }

    return sendResponse.success(
      RESPONSE_CODE.SUCCESS,
      "Successfully sync page to hashnode.",
      200,
      pubArt
    );
  }
}

const notionController = new NotionController();

export default notionController;
