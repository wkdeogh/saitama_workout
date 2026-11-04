import { t } from "./i18n/index.js";
export default function TrainingMotto() {
  return (
    <strong className="training-motto">
      <span>{t("팔굽혀펴기 100회!")}</span>
      <span>{t("윗몸일으키기 100회!")}</span>
      <span>{t("스쿼트 100회!")}</span>
      <span>{t("그리고 달리기 10km!")}</span>
      <span className="training-motto-finale">
        {t("이걸 매일매일 하는 거다!")}
      </span>
    </strong>
  );
}
