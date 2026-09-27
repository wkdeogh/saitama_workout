import { createKakaoHandler } from "../../../server/kakaoAuth.js";
import { getServices } from "../../../server/firebaseAdmin.js";
export default createKakaoHandler({ getServices });
