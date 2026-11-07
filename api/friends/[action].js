import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "../../server/firebaseAdmin.js";
import { friendsService } from "../../server/friendsService.js";
import { kudosService } from "../../server/kudosService.js";
import { createFriendsHandler } from "../../server/friendsHandler.js";
import { virtualService } from "../../server/virtualService.js";
import { ADMIN_EMAIL, isAdministrator } from "../../server/virtualModel.js";
export default createFriendsHandler({
  kudos: () =>
    kudosService(getFirestore(getAdminApp()), getMessaging(getAdminApp())),
  administrator: async (claims) => {
    try {
      const owner = await getAuth(getAdminApp()).getUserByEmail(ADMIN_EMAIL);
      return isAdministrator(claims, owner);
    } catch (error) {
      if (error.code === "auth/user-not-found") return false;
      throw error;
    }
  },
  virtual: () => virtualService(getFirestore(getAdminApp())),
  verify: (token) => getAuth(getAdminApp()).verifyIdToken(token, true),
  service: () =>
    friendsService(getFirestore(getAdminApp()), getMessaging(getAdminApp())),
});
