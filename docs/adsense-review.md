# AdSense 재검토 준비

## 이번 변경

- 앱에서는 광고 컴포넌트와 공통 SDK 로더를 마운트하지 않는다. 로그인, 설정, 로딩, 기록 입력, 랭킹, 야외 훈련장을 포함해 광고를 요청하지 않는다.
- 한국어와 영어의 공개 안내를 `public/guide/`에 정적 HTML로 제공한다. 로그인이나 JavaScript 실행 없이 본문을 읽을 수 있다.
- 콘텐츠 원본은 `content/publicGuide.js`, 생성기는 `scripts/build-public-guide.mjs`다. `npm run build:guide`로 HTML과 사이트맵을 생성하며, 앱 빌드에서도 자동 실행한다.
- 소유권 확인용 `google-adsense-account` 메타 태그와 `public/ads.txt`는 유지한다.
- 2026-11-05에 AdSense의 saitama-workout.vercel.app 자동 광고를 끄고 저장했다. 설정 페이지를 새로고침한 뒤 꺼진 상태를 확인했다. Google 안내에 따르면 설정 반영에는 최대 1시간이 걸릴 수 있다.

## 운영 반영 후 확인

1. `/guide/index.html`과 `/guide/en/index.html`의 소개·기록·성장·계정·야외 훈련장·FAQ를 열어 본문과 링크를 확인한다.
2. 앱 하단의 자세한 이용 안내 링크, 앱 복귀 링크, 언어 전환, 개인정보처리방침 링크를 확인한다.
3. `/robots.txt`, `/sitemap.xml`, `/ads.txt`가 정상 응답하는지 확인한다.
4. 운영 앱과 안내 페이지에 광고 SDK, 광고 iframe, 수동 광고 단위가 생기지 않는지 확인한다.
5. 실제 게시 내용을 확인한 뒤 AdSense 사이트 상세에서 해당 문제를 검토하고 재검토를 요청한다. 코드 변경만으로 승인 상태가 바뀌지는 않는다.

## 향후 광고 도입

`VITE_ADS_MODE=connect`는 더 이상 지원하지 않는다. 재심사 중에는 `off`를 사용한다. 과거 운영 환경에 connect가 남아 있어도 광고 요청을 시작하지 않는다.

승인 후 수동 광고를 도입하려면 별도로 콘텐츠 화면에만 광고 단위를 통합해야 한다. 현재 앱은 환경변수만 바꿔도 광고가 다시 나오도록 구성되어 있지 않다. 구성 검증에서도 `VITE_ADS_MODE=adsense`, `VITE_ADS_APPROVED=true`, 유효한 게시자 ID와 실제 슬롯 ID를 모두 요구한다. 사이트 전체 자동 광고는 켜지 않는다. 슈퍼계정과 광고 제거 권한은 기존 Firebase 계정 claim 검증을 이용한다.

## 참고

- [콘텐츠가 없는 화면의 광고 정책](https://support.google.com/publisherpolicies/answer/11112688?hl=ko)
- [사이트 소유권 확인 방법](https://support.google.com/adsense/answer/12169212?hl=ko)
- [자동 광고 설정](https://support.google.com/adsense/answer/9305577?hl=ko)
