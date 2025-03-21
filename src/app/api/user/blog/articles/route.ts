import { NextRequest } from "next/server";
import { isAuthenticated } from "../../../middlewares/auth";
import CatchError from "../../../utils/_error";
import UserController from "@api/controller/user.controller";

const userController = new UserController();

export const GET = CatchError(
  isAuthenticated(
    async (req: NextRequest) => await userController.articles(req)
  )
);
