import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "../../server/firebaseAdmin.js";
import { virtualService } from "../../server/virtualService.js";
import { createVirtualCron } from "../../server/virtualCron.js";
export default createVirtualCron({
  secret: () => process.env.CRON_SECRET,
  run: () => virtualService(getFirestore(getAdminApp())).refresh(),
});
