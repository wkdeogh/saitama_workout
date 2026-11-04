# AdSense 연결과 계정별 광고 제거

2026-11-04. 웹 게시자 ID는 `ca-pub-6094417231997652`다. 실제 사이트 승인/자동 광고 설정/송출 상태는 AdSense 계정에서 확인한다. 코드가 제공됐다는 사실만으로 승인 완료라고 표시하지 않는다.

## 현재 연결

- `index.html`의 `google-adsense-account` 메타 태그와 `/ads.txt`로 사이트 연결을 확인할 수 있다. AdSense의 사이트 연결 화면에서 메타 태그 또는 ads.txt 검증 방법을 선택할 수 있다.
- 운영 기본 모드 `connect`에서는 로그인과 광고 제거 권한 확인이 끝난 후 사용자가 제공한 URL의 async/crossorigin 스크립트를 `<head>`에 한 번 넣는다. HTML에 무조건 실행하는 script를 박아 넣지 않아 광고 제거 계정은 SDK 요청도 하지 않는다.
- `connect`는 공통 스크립트 연결이다. 자동 광고 노출/배치는 AdSense 계정의 Auto ads 설정이 결정한다. 수동 카드 광고는 별도 `data-ad-slot`이 있어야 한다. 슬롯 ID를 임의로 만들지 않는다.
- 카드 하나만 유지하려면 AdSense에서 자동 광고를 끄고 `VITE_ADS_MODE=adsense`, `VITE_ADSENSE_SLOT=발급된_슬롯_ID`를 설정한다. 샘플 카드 소재는 실제 Google 광고에 덧붙이지 않는다.
- 개발 기본값은 `preview`라 실제 Google 광고 네트워크에 요청하지 않는다. `off`는 스크립트와 카드 모두 끈다. Vite 환경 변수는 빌드 시 적용한다. 에뮬레이터 설정을 운영에 복사하지 않는다.
- SDK 로드 실패/차단/타임아웃은 운동 저장과 독립적이다. 광고 슬롯이 없거나 unfilled이면 가짜 광고 공간을 만들지 않는다.

## 광고 제거 권한

광고 제거 여부는 **Firebase ID 토큰의 `adFree: true` 커스텀 클레임**만 신뢰한다. 운동 기록 JSON, 브라우저 저장값, 프런트엔드의 추천 코드 목록에 권한을 넣지 않는다. 로그인 초기화/권한 조회 중이나 조회 실패 시에는 광고를 요청하지 않는다. 이전 계정의 조회 결과를 새 계정에 적용하지 않는다.

`server/adEntitlements.js`의 `setAdFreeAccount(adminAuth, uid, enabled)`는 신뢰할 수 있는 서버에서만 호출하는 공통 갱신 함수다. 기존 관리자/카카오 클레임을 보존한다. 이 함수를 클라이언트 입력으로 직접 호출할 수 있는 API는 만들지 않았다.

권한 변경 후에는 ID 토큰을 강제로 갱신한다(`getIdToken(true)`). 새 클레임을 받으면 표시 여부가 바뀐다. 광고 SDK가 이미 실행된 상태에서 로그인 계정이나 권한이 바뀌면 문서를 새로 열어 SDK의 iframe/타이머가 다음 계정에 남지 않게 한다. 첫 방문부터 광고 제거 계정으로 로그인되어 있으면 SDK를 로드하지 않는다.

## 추후 지정 코드 입력 기능

아직 코드 입력 화면이나 실제 코드를 발급하지 않았다. 추가할 때 다음 경로를 사용한다.

1. 서버에 코드 해시, 만료일, 사용 가능 횟수, 활성 상태를 보관한다. 원문 코드나 해시를 웹 번들에 포함하지 않는다.
2. 로그인한 사용자의 Firebase ID 토큰을 서버에서 검증하고, 코드 입력 요청에는 시도 제한을 적용한다.
3. 트랜잭션으로 코드 사용과 계정별 지급 내역을 함께 기록한다. 같은 계정의 재입력은 중복 차감/중복 지급하지 않는다.
4. 지급 내역에서 유효한 광고 제거 권한을 계산한 뒤 공통 클레임 갱신 함수를 호출한다. 클라이언트는 토큰을 갱신한다.

## 추후 결제 연결

코드 지급과 결제 지급은 별개의 서버 지급 내역으로 기록하고, 둘 중 유효한 내역이 하나라도 있으면 `adFree`를 유지한다. 한 결제 환불이 다른 유효한 코드 지급까지 지우지 않게 한다.

웹 결제는 검증된 서버 결제 완료 알림을, 네이티브 인앱결제는 Apple/Google의 서버 검증 결과를 사용한다. 클라이언트의 결제 성공 콜백만으로 권한을 주지 않는다. Apple의 transactionId, Google Play의 purchaseToken을 계정에 연결해 중복 지급을 막고 구매 복원과 환불/취소 시 재계산도 같은 경로로 연결한다. 현재 결제 상품·가격·구매 버튼은 추가하지 않았다. 네이티브 광고를 추가할 경우에도 동일한 계정 권한으로 AdMob 초기화를 차단한다.

## 개인정보 및 외부 설정

개인정보처리방침에 광고 쿠키/외부 제공자 안내가 연결되어 있다. 광고 대상 지역에 필요한 동의 메시지/CMP는 AdSense의 개인정보 보호 및 메시지 설정에서 관리한다. 현재 앱에는 결제/코드 지급 정보가 없으며, 그 기능을 추가할 때 처리 항목·보관 기간도 갱신한다.

## 공식 참고

- [사이트 연결: 스크립트, 메타 태그, ads.txt](https://support.google.com/adsense/answer/7584263?hl=ko)
- [자동 광고 설정](https://support.google.com/adsense/answer/9261307?hl=ko)
- [ads.txt](https://support.google.com/adsense/answer/12171612?hl=ko)
- [Google Play 구매 검증과 중복 지급 방지](https://developer.android.com/google/play/billing/security)
- [Apple App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [서버에서 설정하는 Firebase 커스텀 클레임](https://firebase.google.com/docs/auth/admin/custom-claims)
