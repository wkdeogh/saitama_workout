// Editorial content based on the app's recording, progression and account contracts.
export const guidePages = [
  {
    slug: "index",
    ko: {
      label: "서비스 소개",
      title: "운동을 기록하고, 내 캐릭터의 변화를 보세요.",
      description:
        "빡빡이훈련소는 실제로 한 운동을 기록하면 캐릭터가 성장하는 무료 웹 운동 기록장입니다. 기록과 가상 훈련의 차이, 시작 방법을 소개합니다.",
      lead: "빡빡이훈련소는 오늘 한 운동을 남기고, 쌓인 운동량을 캐릭터의 변화로 확인하는 웹 운동 기록장입니다. 처음에는 로그인 없이 시작할 수 있습니다.",
      sections: [
        [
          "이 앱에서 하는 일",
          "<p>푸쉬업, 스쿼트, 기타운동 횟수와 달리기 거리를 날짜별로 기록합니다. 캘린더로 지난 기록을 확인하고, 운동량에 따라 쌓이는 EXP로 캐릭터의 레벨과 외형을 키웁니다. 목표 달성 여부와 운동량은 따로 계산하므로 목표를 전부 채우지 못한 날의 운동도 성장에 반영됩니다.</p><p>다른 유저와 캐릭터를 보여주고 싶을 때는 야외 훈련장을 이용합니다. 실제 운동을 기록하는 훈련소와 가상 공간에서 캐릭터를 움직이는 야외 훈련장은 역할이 다릅니다.</p>",
        ],
        [
          "첫 기록을 남기는 순서",
          "<ol><li><strong>목표를 정합니다.</strong> 설정 또는 사용 가이드에서 현재 상황에 맞게 바꿉니다.</li><li><strong>실제로 한 운동량을 입력합니다.</strong> 달리기는 km 단위이며, 0.1km부터 기록합니다.</li><li><strong>운동 기록 저장을 누릅니다.</strong> 같은 날 다시 저장할 때는 그날의 누적 합계를 입력합니다.</li><li><strong>캐릭터와 캘린더를 확인합니다.</strong> 목표 달성 표시와 획득 EXP를 각각 볼 수 있습니다.</li></ol>",
        ],
        [
          "목표보다 적게 운동한 날도 남길 수 있습니다",
          '<div class="example"><p class="example-label">첫날의 기록 예시</p><p>푸쉬업 40개 + 스쿼트 30개 + 기타운동 20개 + 달리기 1km</p><strong>40 + 30 + 20 + 20 = 110 EXP</strong><p>이전 기록이 없는 캐릭터라면 LV. 1에서 LV. 2가 되고, 다음 레벨을 향한 10 EXP가 남습니다. 하루 목표가 각각 100개·10km여도 이 운동량은 모두 반영됩니다.</p></div>',
        ],
        [
          "기록을 가볍게 시작하고, 계정으로 이어가세요",
          "<p>비회원 기록은 현재 브라우저에 저장됩니다. 계정으로 로그인하면 기기에 있던 기록을 계정으로 이어받고 동기화할 수 있습니다. 다른 기기에서도 이어 쓰려면 같은 계정으로 로그인하고 동기화 상태를 확인하세요.</p><p>앱은 수행한 운동량을 정리하는 도구입니다. 기본 목표 100개·10km는 변경 가능한 시작값이며, 모든 사람에게 권장되는 운동 처방을 뜻하지 않습니다. 목표는 자신의 상황에 맞게 설정하세요.</p>",
        ],
      ],
    },
    en: {
      label: "About",
      title: "Record your workouts. Watch your character change.",
      description:
        "BBAKBAK Training is a free web workout log that turns recorded exercise into character growth. Learn how workout records, goals and the virtual Outdoor Gym differ.",
      lead: "BBAKBAK Training is a web workout log. Record what you actually did today, then see your accumulated exercise reflected in your character. You can start without signing in.",
      sections: [
        [
          "What the app does",
          "<p>Log push-ups, squats, other exercise repetitions and running distance by date. Review past workouts on the calendar and earn EXP that changes your character’s level and appearance. Goal completion and exercise volume are calculated separately, so a workout still counts even when you do not reach every goal.</p><p>The Outdoor Gym is a shared virtual space for showing your character to other users. It serves a different purpose from Training, where you record actual exercise.</p>",
        ],
        [
          "Your first workout record",
          "<ol><li><strong>Choose your goals.</strong> Change them in Settings or the user guide.</li><li><strong>Enter your actual workout.</strong> Running is measured in kilometres, in increments of 0.1km.</li><li><strong>Save the workout.</strong> If you save again that day, enter the complete daily total.</li><li><strong>Check your character and calendar.</strong> Goal completion and earned EXP are shown separately.</li></ol>",
        ],
        [
          "A partial workout still counts",
          '<div class="example"><p class="example-label">Example: your first day</p><p>40 push-ups + 30 squats + 20 other exercise reps + a 1km run</p><strong>40 + 30 + 20 + 20 = 110 EXP</strong><p>A character with no previous records moves from LV. 1 to LV. 2 and keeps 10 EXP toward the next level. These exercises count even if the goals remain 100 reps and 10km.</p></div>',
        ],
        [
          "Start locally, then continue with an account",
          "<p>Guest records are saved in the current browser. Signing in lets you carry those records into your account and synchronize them. To continue on another device, sign in to the same account and check the sync status.</p><p>The app organizes exercise you have completed. The initial goals of 100 reps and 10km are editable starting values, not a universal exercise prescription. Set goals appropriate to your situation.</p>",
        ],
      ],
    },
  },
  {
    slug: "recording",
    ko: {
      label: "기록과 목표",
      title: "횟수는 오늘의 합계로, 목표는 내 상황에 맞게.",
      description:
        "오늘 운동을 기록하는 방법, 하루 입력 한도, 달리기 단위, 목표 변경과 선택 운동을 구체적인 예시로 설명합니다.",
      lead: "운동 입력칸은 오늘 하루의 누적 운동량입니다. 목표를 채웠는지와 관계없이 실제로 한 만큼 입력하고 저장하면 됩니다.",
      sections: [
        [
          "입력 단위와 하루 한도",
          '<div class="table-scroll"><table><caption>운동 종류별 기록 범위</caption><thead><tr><th scope="col">종류</th><th scope="col">단위</th><th scope="col">하루 최대</th></tr></thead><tbody><tr><th scope="row">푸쉬업</th><td>1개</td><td>300개</td></tr><tr><th scope="row">스쿼트</th><td>1개</td><td>300개</td></tr><tr><th scope="row">기타운동</th><td>1개</td><td>300개</td></tr><tr><th scope="row">달리기</th><td>0.1km</td><td>60km</td></tr></tbody></table></div><p>기타운동은 한 칸에 합산해 기록하는 항목입니다. 여러 기타운동을 기록하더라도 해당 입력칸의 하루 합계 한도는 300개입니다. 달리기의 +·− 버튼은 0.1km씩, 빠른 입력 버튼은 +1km·+3km씩 바뀝니다.</p>',
        ],
        [
          "같은 날 다시 입력할 때",
          '<div class="example"><p class="example-label">오전에 40개, 오후에 20개를 더 했다면</p><p>오전에 푸쉬업 40개를 저장했습니다. 오후에는 입력칸을 <strong>60개</strong>로 바꾸고 저장합니다. 20개로 저장하면 오늘 기록이 20개로 바뀝니다.</p><p>저장 버튼을 여러 번 눌러도 동일한 하루 기록이 중복으로 추가되지 않습니다. 추가 운동량이 아니라 그날의 최종 합계를 남기는 방식입니다.</p></div>',
        ],
        [
          "오늘 날짜만 수정할 수 있습니다",
          "<p>오늘 운동량을 입력·수정·삭제할 수 있으며, 지난 날짜의 기록은 캘린더에서 조회합니다. 놓친 날짜를 선택해 뒤늦게 운동량을 입력할 수는 없습니다. 기록 날짜는 앱을 실행하는 기기의 날짜를 기준으로 합니다.</p><p>날짜가 바뀐 뒤에는 오늘 날짜를 다시 확인하고 입력하세요. 과거 기록을 선택한 상태라면 오늘 버튼으로 돌아옵니다.</p>",
        ],
        [
          "목표를 바꾸는 방법",
          "<p>상단 톱니바퀴의 하루 운동 목표에서 수정하거나, 사용 가이드의 운동 입력과 목표 페이지에서 바로 저장할 수 있습니다. 가이드에서 목표를 수정한 뒤 다음을 눌러도 저장됩니다.</p><p>푸쉬업과 스쿼트 목표는 각각 1~300개입니다. 기타운동은 0~300개, 달리기는 0~60km로 설정할 수 있습니다. 기타운동·달리기의 목표를 0으로 설정하면 선택 운동이 되어 목표 달성 판정에서 제외됩니다. 운동을 기록하면 EXP는 그대로 얻습니다.</p><p>변경한 목표는 현재 목표와 오늘 기록에 적용됩니다. 지난 기록에 남아 있는 당시 목표는 바뀌지 않습니다. 목표를 낮추거나 높여도 이미 수행한 운동량과 그 운동으로 얻는 EXP가 자동으로 늘어나지는 않습니다.</p>",
        ],
      ],
    },
    en: {
      label: "Records & goals",
      title: "Record the daily total. Choose goals that fit you.",
      description:
        "How to record today’s workout, daily limits, running increments, optional exercises and goal changes, with practical examples.",
      lead: "Each field holds the total exercise completed today. Enter what you actually did and save it, whether or not you reached your goals.",
      sections: [
        [
          "Units and daily limits",
          '<div class="table-scroll"><table><caption>Recording limits by exercise</caption><thead><tr><th scope="col">Exercise</th><th scope="col">Increment</th><th scope="col">Daily maximum</th></tr></thead><tbody><tr><th scope="row">Push-ups</th><td>1 rep</td><td>300 reps</td></tr><tr><th scope="row">Squats</th><td>1 rep</td><td>300 reps</td></tr><tr><th scope="row">Other exercises</th><td>1 rep</td><td>300 reps</td></tr><tr><th scope="row">Running</th><td>0.1km</td><td>60km</td></tr></tbody></table></div><p>Other exercises are combined into one field. Its daily limit remains 300 reps even when you combine multiple activities. Running’s + and − controls change the value by 0.1km; quick-add buttons add 1km or 3km.</p>',
        ],
        [
          "Updating a workout on the same day",
          '<div class="example"><p class="example-label">40 morning reps, then 20 more</p><p>You saved 40 push-ups in the morning. After doing another 20, change the field to <strong>60</strong> and save. Entering 20 would replace today’s push-up total with 20.</p><p>Saving repeatedly does not create duplicate daily records. The app stores the final total for the day, rather than adding a new workout session each time.</p></div>',
        ],
        [
          "Only today can be edited",
          "<p>You can enter, update and delete today’s exercise. Past records remain available on the calendar for viewing; missed dates cannot be filled in later. The recording date follows the date on the device running the app.</p><p>Check the selected date after midnight. If you are viewing an earlier record, use Today to return to the current day before entering exercise.</p>",
        ],
        [
          "Changing your goals",
          "<p>Use Daily workout goals under the gear icon, or edit the values directly on the Workouts & goals page in the user guide. Moving to the next guide page also saves edited goals.</p><p>Push-up and squat goals range from 1 to 300 reps. Other exercises allow 0–300 reps, and running allows 0–60km. A goal of 0 makes other exercises or running optional for goal completion. Recording those exercises still earns EXP.</p><p>New goals apply to the current goals and today’s record. Targets stored in past records stay unchanged. Changing a goal does not increase your completed exercise or the EXP earned from it.</p>",
        ],
      ],
    },
  },
  {
    slug: "growth",
    ko: {
      label: "EXP와 성장",
      title: "운동량, 목표 달성, 연속 운동은 따로 계산합니다.",
      description:
        "EXP 환산, 100 EXP당 레벨 상승, 연속 운동 보상과 미기록에 따른 레벨 감소를 계산 예시와 함께 설명합니다.",
      lead: "레벨은 기록한 운동량으로 성장합니다. 목표 달성 표시는 목표와의 비교 결과이고, 연속 운동 보상은 운동을 이어간 날짜에 따른 별도 변화입니다.",
      sections: [
        [
          "운동량이 EXP로 바뀌는 방법",
          '<p>푸쉬업·스쿼트·기타운동은 각각 1개당 1 EXP입니다. 달리기는 0.1km당 2 EXP이므로 1km는 20 EXP입니다. 목표 달성 여부나 목표 크기로 이 환산 비율이 바뀌지 않습니다.</p><div class="example"><p class="example-label">하루 EXP 계산</p><p>푸쉬업 30개 + 스쿼트 20개 + 기타운동 10개 + 달리기 1.5km</p><strong>30 + 20 + 10 + 30 = 90 EXP</strong><p>일부 목표만 채웠더라도 기록한 운동량 전체가 계산됩니다.</p></div>',
        ],
        [
          "레벨과 캐릭터 외형",
          "<p>100 EXP마다 1레벨이 오르며 최대 레벨은 1000입니다. 예를 들어 현재 레벨의 진행도가 70 EXP인 상태에서 50 EXP를 얻으면 한 레벨이 오르고 20 EXP가 남습니다. 최대 레벨에서는 다음 레벨을 위한 EXP를 쌓지 않습니다.</p><p>성장 도감은 레벨에 따라 달라지는 체형, 근육, 머리카락, 의상과 에너지 효과를 보여줍니다. 아직 도달하지 않은 단계는 실루엣으로 표시되며, 해당 레벨에 도달하면 외형이 공개됩니다.</p>",
        ],
        [
          "연속 운동 보상",
          "<p>연속 운동은 운동량이 0보다 큰 기록이 이어진 날 수로 계산합니다. 목표를 전부 채우지 못해도 운동 기록이 있으면 이어갈 수 있습니다.</p><p>10일마다 오라가 강화되고 60일까지 보상이 달라집니다. 30일에는 불꽃 눈, 50일에는 청록색 불꽃 눈이 열립니다. 하루를 쉬면 연속 운동 일수가 끊기므로 이 보상은 캐릭터 레벨 해금과 구분해서 보세요.</p>",
        ],
        [
          "기록을 쉬었을 때",
          "<p>마지막 운동 후 미기록 5일째부터 매일 1레벨씩 감소하며, LV. 1 아래로 내려가지는 않습니다. 예를 들어 월요일에 운동을 기록하고 다음 기록이 없다면 화요일이 미기록 1일째, 토요일이 5일째입니다. 토요일부터 레벨 감소가 적용됩니다.</p><p>운동 기록을 다시 남기면 마지막 운동일이 갱신됩니다. 미기록에 따른 변화는 누적 운동량을 지우는 기능이 아니므로, 전체 누적 EXP만 보고 현재 레벨을 계산하면 화면의 레벨과 다를 수 있습니다.</p>",
        ],
      ],
    },
    en: {
      label: "EXP & growth",
      title: "Exercise, goal completion and streaks are separate.",
      description:
        "EXP conversion, leveling every 100 EXP, streak rewards and inactivity level loss, explained through worked examples.",
      lead: "Recorded exercise drives your level. Goal completion compares the record with your targets. Streak rewards are a separate change based on consecutive workout days.",
      sections: [
        [
          "Converting exercise into EXP",
          '<p>Each push-up, squat or other exercise rep earns 1 EXP. Running earns 2 EXP per 0.1km, or 20 EXP per kilometre. Your goal size and completion status do not change these rates.</p><div class="example"><p class="example-label">Daily EXP example</p><p>30 push-ups + 20 squats + 10 other exercise reps + a 1.5km run</p><strong>30 + 20 + 10 + 30 = 90 EXP</strong><p>All recorded exercise counts, even when only some goals are complete.</p></div>',
        ],
        [
          "Levels and appearance",
          "<p>Every 100 EXP raises your level by one, up to LV. 1000. If you have 70 EXP toward the next level and earn another 50, you gain one level and retain 20 EXP. At the maximum level there is no next-level EXP to accumulate.</p><p>The Evolution collection shows changes to body shape, muscles, hair, clothing and energy effects. Locked stages appear as silhouettes until you reach their required levels.</p>",
        ],
        [
          "Workout streak rewards",
          "<p>A streak counts consecutive days with a recorded workout worth more than zero EXP. Reaching every goal is not required to maintain it.</p><p>Your aura upgrades every 10 days, with rewards changing through day 60. Fiery eyes unlock at 30 days and teal fiery eyes at 50 days. Missing a day breaks the streak, so these rewards are separate from appearance unlocked by character level.</p>",
        ],
        [
          "Taking time away from recording",
          "<p>From the fifth day without a workout, you lose one level per day, with a minimum of LV. 1. If you record on Monday and do not record again, Tuesday is day one without a workout and Saturday is day five. Level loss starts on Saturday.</p><p>Recording exercise again updates the last workout date. Inactivity does not erase your accumulated exercise, so calculating your current level from lifetime EXP alone can give a different result from the displayed level.</p>",
        ],
      ],
    },
  },
  {
    slug: "accounts",
    ko: {
      label: "계정과 동기화",
      title: "기기 안의 기록을 계정으로 이어가는 방법.",
      description:
        "비회원 저장 범위, 로그인 후 기록 병합, 동기화 확인, 계정 메뉴와 슈퍼계정 상태를 안내합니다.",
      lead: "비회원도 운동을 기록할 수 있습니다. 여러 기기에서 이어 쓰려면 계정 로그인을 이용하며, 기기 저장과 서버 동기화 상태를 구분해서 확인합니다.",
      sections: [
        [
          "비회원 기록의 저장 범위",
          "<p>비회원으로 저장한 기록은 해당 기기의 해당 브라우저에 남습니다. 같은 휴대폰에서도 다른 브라우저를 사용하면 같은 기록이 자동으로 나타나지 않습니다. 브라우저의 사이트 데이터를 지우거나 임시 브라우징을 종료하면 기기에만 있던 기록을 잃을 수 있습니다.</p><p>계정을 만들기 전에도 기본 기능을 둘러보고 오늘 운동을 기록할 수 있습니다. 계정 로그인을 한 뒤 기기 기록이 이어졌는지 확인하고 동기화를 완료하세요.</p>",
        ],
        [
          "기존 계정에 같은 날짜의 기록이 있다면",
          '<p>로그인하면 기기에 있는 비회원 기록을 계정으로 이어받습니다. 같은 날짜가 양쪽에 있으면 운동 종류별로 더 큰 값을 사용해 동일한 운동이 두 번 더해지는 것을 방지합니다.</p><div class="example"><p class="example-label">같은 날의 두 기록을 이어받는 예시</p><p>계정: 푸쉬업 40개·스쿼트 10개<br>기기: 푸쉬업 25개·스쿼트 30개</p><strong>결과: 푸쉬업 40개·스쿼트 30개</strong><p>푸쉬업을 65개로 합산하지 않습니다. 서로 다른 날의 기록은 날짜별로 이어받습니다. 이미 사용하던 계정의 목표는 유지됩니다.</p></div>',
        ],
        [
          "동기화 상태 확인하기",
          "<p>상단 사람 아이콘을 누르면 내 계정이 열립니다. 로그인한 계정, 동기화 상태, 수동 동기화·로그아웃, 캐릭터 이름 변경을 이곳에서 확인할 수 있습니다.</p><p>로그인 상태에서 기록이 바뀌면 자동 동기화를 시도합니다. 이 기기에 저장됨·동기화 대기 표시는 서버 반영이 끝났다는 뜻이 아닙니다. 연결 문제 메시지가 나오면 네트워크를 확인한 뒤 내 계정의 동기화를 눌러 다시 시도합니다.</p><p>다른 기기로 이동하기 전에는 동기화 완료를 확인하세요. 비회원 기록과 로그인한 계정의 기록은 분리해 보관합니다.</p>",
        ],
        [
          "이름과 계정 상태",
          "<p>캐릭터 이름은 최대 20자로 저장합니다. 내 계정에서 바꾸거나 야외 훈련장 입장 화면의 연필 버튼을 사용할 수 있습니다. 로그인한 캐릭터 이름·레벨·운동량은 랭킹에 공개될 수 있습니다.</p><p>슈퍼코드가 적용된 계정에는 슈퍼계정 표시가 나타납니다. 이 상태는 계정에 연결되며, 이름을 바꾸거나 같은 계정으로 다시 로그인해도 유지됩니다. 레벨·EXP를 추가로 주는 기능은 아닙니다. 개인정보 처리와 삭제 문의는 개인정보처리방침에서 확인할 수 있습니다.</p>",
        ],
      ],
    },
    en: {
      label: "Accounts & sync",
      title: "Carry your local records into an account.",
      description:
        "Guest storage, merging records after sign-in, sync status, the account menu and Super account status.",
      lead: "You can record workouts as a guest. Sign in to continue across devices, and distinguish records saved on your device from records synchronized to the server.",
      sections: [
        [
          "Where guest records live",
          "<p>Guest records stay in the browser on the device where they were saved. A different browser on the same phone does not automatically share those records. Clearing site data or ending a private-browsing session can remove records stored only on that device.</p><p>You can explore the basic features and record today’s workout before signing in. After signing in, check that your local records were carried over and complete synchronization.</p>",
        ],
        [
          "When the account already has a record for the same date",
          '<p>Signing in carries local guest records into your account. When both sides contain the same date, the app takes the larger value for each exercise to avoid counting the same exercise twice.</p><div class="example"><p class="example-label">Merging two records for one day</p><p>Account: 40 push-ups, 10 squats<br>Device: 25 push-ups, 30 squats</p><strong>Result: 40 push-ups, 30 squats</strong><p>Push-ups are not added into a total of 65. Records for different dates are carried over separately. Goals on an established account remain unchanged.</p></div>',
        ],
        [
          "Checking synchronization",
          "<p>Use the person icon in the header to open My account. It contains your signed-in account, sync status, manual sync, sign-out and character-name editing.</p><p>When signed-in records change, the app attempts to synchronize automatically. Saved on this device / sync pending does not mean the server has received the changes. If a connection message appears, check your network and use Sync in My account to retry.</p><p>Check for Synced before moving to another device. Guest records and signed-in account records are stored separately.</p>",
        ],
        [
          "Names and account status",
          "<p>Character names allow up to 20 characters. Edit yours in My account or with the pencil button on the Outdoor Gym entry screen. Signed-in character names, levels and exercise totals may appear in rankings.</p><p>Accounts with an applied super code display Super account status. It belongs to the account and remains after a name change or signing back in. It does not award extra levels or EXP. See the privacy policy for data handling and deletion enquiries.</p>",
        ],
      ],
    },
  },
  {
    slug: "outdoor",
    ko: {
      label: "야외 훈련장",
      title: "내 캐릭터로 다른 유저를 만나는 공간.",
      description:
        "야외 훈련장 입장과 퇴장, 키보드와 모바일 조작, 동작 반복, 달리기 토글, 닉네임과 말풍선의 표시 방식을 안내합니다.",
      lead: "야외 훈련장은 다른 유저와 캐릭터를 보여주고 만나는 가상 공간입니다. 여기서 하는 동작은 실제 운동 기록과 구분됩니다.",
      sections: [
        [
          "입장과 퇴장",
          "<p>하단 야외 훈련장 탭에서 내 캐릭터를 확인하고 입장하기를 누릅니다. 입장하면 3D 월드가 화면을 채우며, 오른쪽 위 나가기로 앱에 돌아옵니다. 비회원도 같은 공간에 접속한 다른 유저를 만날 수 있습니다.</p><p>잔디 필드, 나무, 울타리 안 운동 공간과 주변 트랙을 둘러볼 수 있습니다. 벤치프레스·스미스머신 등 배치된 운동 기구는 공간을 구성하는 요소입니다. 모든 기구에 별도의 사용 동작이 있는 것은 아닙니다.</p>",
        ],
        [
          "컴퓨터와 모바일 조작",
          '<div class="table-scroll"><table><caption>훈련장 기본 조작</caption><thead><tr><th scope="col">기능</th><th scope="col">방법</th></tr></thead><tbody><tr><th scope="row">컴퓨터 이동</th><td>WASD 또는 방향키</td></tr><tr><th scope="row">모바일 이동</th><td>화면 왼쪽 아래 조이스틱</td></tr><tr><th scope="row">카메라 회전</th><td>월드 화면 드래그</td></tr><tr><th scope="row">걷기·달리기</th><td>달리기 버튼으로 전환</td></tr></tbody></table></div><p>기본 시점은 캐릭터의 등 뒤입니다. 달리기 버튼은 이동 방식을 바꾸는 토글이므로, 켠 다음 이동 입력을 해야 달리며 움직입니다. 다시 누르면 걷기로 돌아옵니다.</p>',
        ],
        [
          "푸쉬업과 스쿼트",
          '<p>푸쉬업 또는 스쿼트 버튼을 누르면 캐릭터가 해당 동작을 반복합니다. 같은 버튼을 다시 누르거나 캐릭터를 이동시키면 멈춥니다. 스쿼트는 가슴 앞에 손을 모으고, 무릎이 발끝 방향으로 벌어지는 자세로 움직입니다.</p><div class="example"><p class="example-label">실제 기록과 가상 동작의 차이</p><p>훈련장에서 캐릭터가 스쿼트를 여러 번 해도 오늘 기록의 스쿼트 횟수와 EXP는 늘지 않습니다. 실제로 한 운동은 훈련소 탭에 직접 입력하고 저장하세요.</p></div>',
        ],
        [
          "이름과 대화",
          "<p>캐릭터 위에 닉네임이 표시되고, 채팅을 보내면 머리 위 말풍선으로 나타납니다. 다른 유저의 닉네임과 말풍선은 가까워졌을 때 보이고 멀어지면 사라집니다.</p><p>채팅은 한 번에 최대 80자이며 말풍선은 잠시 표시된 뒤 사라집니다. 공개 공간이므로 대화에 개인정보를 쓰지 마세요. 다른 유저가 보이지 않으면 공유 서버 연결 상태를 확인하고 잠시 뒤 다시 접속해 보세요.</p>",
        ],
      ],
    },
    en: {
      label: "Outdoor Gym",
      title: "Meet other users as your character.",
      description:
        "Entering and leaving the Outdoor Gym, keyboard and joystick controls, repeating actions, running mode, nearby nicknames and speech bubbles.",
      lead: "The Outdoor Gym is a shared virtual space for meeting other users and showing your character. Actions here are separate from real workout records.",
      sections: [
        [
          "Entering and leaving",
          "<p>Open the Outdoor Gym tab, review your character and select Enter. The 3D world fills the screen; Exit in the top-right returns you to the app. Guests can also meet other users connected to the same space.</p><p>Explore the grass field, trees, fenced workout area and surrounding track. Equipment such as the bench press and Smith machine forms part of the environment. Not every piece has a separate interaction or exercise animation.</p>",
        ],
        [
          "Desktop and mobile controls",
          '<div class="table-scroll"><table><caption>Basic world controls</caption><thead><tr><th scope="col">Function</th><th scope="col">Control</th></tr></thead><tbody><tr><th scope="row">Desktop movement</th><td>WASD or arrow keys</td></tr><tr><th scope="row">Mobile movement</th><td>Bottom-left joystick</td></tr><tr><th scope="row">Rotate the camera</th><td>Drag the world view</td></tr><tr><th scope="row">Walk or run</th><td>Toggle the running button</td></tr></tbody></table></div><p>The default view is behind your character. Running is a movement-mode toggle: enable it, then use the movement controls to run. Toggle it again to return to walking.</p>',
        ],
        [
          "Push-ups and squats",
          '<p>Press Push-ups or Squats to repeat the selected animation. Press the same button again or move your character to stop. During squats, the hands stay together at the chest and the knees open in the direction of the toes.</p><div class="example"><p class="example-label">Virtual actions and real records</p><p>Even if your character performs several squats in the world, today’s squat count and EXP do not increase. Record exercise you actually completed in the Training tab and save it there.</p></div>',
        ],
        [
          "Names and conversation",
          "<p>Nicknames appear above characters, and sent chat messages appear in speech bubbles. Other users’ names and bubbles become visible nearby and disappear at a distance.</p><p>Messages allow up to 80 characters and bubbles disappear after a short time. This is a public space; do not include personal information in chat. If other users are missing, check the shared-server connection status and try reconnecting later.</p>",
        ],
      ],
    },
  },
  {
    slug: "faq",
    ko: {
      label: "자주 묻는 질문",
      title: "기록과 이용 중 헷갈리기 쉬운 점.",
      description:
        "목표와 EXP, 기록 저장, 레벨 감소, 계정과 랭킹, 홈 화면 설치에 대한 빡빡이훈련소의 답변입니다.",
      lead: "화면에 보이는 값이 예상과 다를 때 먼저 확인할 내용을 모았습니다. 여기서 해결되지 않으면 이용 환경과 함께 문의해 주세요.",
      sections: [
        [
          "목표를 못 채웠는데 EXP가 올랐어요",
          "<p>정상 동작입니다. EXP는 실제로 기록한 운동량으로 계산하고, 목표 달성 표시는 저장된 목표를 채웠는지 따로 판단합니다. 반대로 목표만 낮춰 달성 표시가 생겨도 추가 EXP가 생기지는 않습니다.</p>",
        ],
        [
          "입력했던 횟수가 다른 기기에 없어요",
          "<p>비회원 기록은 브라우저 안에만 있습니다. 원래 기록한 기기에서 먼저 로그인해 동기화를 완료한 뒤, 다른 기기에서도 같은 계정으로 로그인하세요. 로그인 상태에서도 동기화 대기나 오류 메시지가 있으면 서버 반영 전일 수 있습니다.</p>",
        ],
        [
          "기록을 쉬었더니 레벨이나 오라가 달라졌어요",
          "<p>미기록 5일째부터 레벨이 매일 1씩 감소합니다. 연속 운동 보상인 오라와 불꽃 눈은 연속 일수에 따라 달라지므로 하루를 쉬어도 바뀔 수 있습니다. 누적 EXP, 현재 레벨, 연속 운동 일수는 서로 다른 지표입니다.</p>",
        ],
        [
          "친구 검색과 주간 랭킹은 어떻게 보나요?",
          "<p>친구 탭에서 닉네임 앞부분 또는 계정 태그로 찾습니다. 계정 태그는 같은 닉네임을 쓰는 유저를 구분하는 데 유용합니다. 전체 랭킹은 상위 50명까지 표시하며, 주간 랭킹은 한국 시간 월요일 0시부터 집계합니다.</p>",
        ],
        [
          "오운완의 공유와 링크복사는 무엇이 다른가요?",
          "<p>오운완을 누르면 오늘 기록을 저장하고 캐릭터 인증 이미지를 만듭니다. 공유는 이미지를 전달하고, 링크복사는 앱 주소를 복사합니다. 링크를 받은 사람이 내 개인 운동 기록에 자동으로 접근할 수 있는 것은 아닙니다.</p>",
        ],
        [
          "홈 화면에 추가할 수 있나요?",
          "<p>아이폰은 Safari의 공유 메뉴에서 홈 화면에 추가를 선택합니다. 웹 앱으로 열기가 보이면 켜세요. 아이폰의 푸시 알림은 홈 화면에 추가한 앱에서 사용할 수 있습니다. Android Chrome은 메뉴의 홈 화면에 추가에서 설치 또는 바로가기 만들기를 선택합니다. 브라우저 버전에 따라 메뉴 이름은 다를 수 있습니다.</p>",
        ],
        [
          "오류는 어디에 문의하나요?",
          '<p>운영 문의: <a href="mailto:wkdeoghq@gmail.com">wkdeoghq@gmail.com</a></p><p>어떤 화면에서 무엇을 눌렀는지, 기대한 결과와 실제 결과, 사용 기기·브라우저를 알려주면 확인에 도움이 됩니다. 화면을 첨부할 때는 이메일이나 대화 내용 등 공유하지 않을 정보는 가려 주세요. 비밀번호나 인증코드는 보내지 마세요.</p>',
        ],
      ],
    },
    en: {
      label: "FAQ",
      title: "Answers to common recording and account questions.",
      description:
        "Answers about workout goals, EXP, saved records, inactivity, friends, rankings, sharing and Home Screen installation.",
      lead: "Start here when something looks different from what you expected. If these answers do not resolve the issue, contact us with details of your device and browser.",
      sections: [
        [
          "Why did I earn EXP without reaching my goals?",
          "<p>This is expected. EXP is calculated from recorded exercise, while goal completion separately compares that record with its saved targets. Lowering a goal can change completion status, but does not award extra EXP.</p>",
        ],
        [
          "Why are my records missing on another device?",
          "<p>Guest records stay inside the browser. Sign in and finish syncing on the device where you originally recorded exercise, then sign in to the same account on the other device. Even when signed in, sync pending or an error message may mean the server has not received the latest changes.</p>",
        ],
        [
          "Why did my level or aura change after a break?",
          "<p>Level loss starts on the fifth day without a workout, at one level per day. Auras and fiery eyes depend on your streak, so missing even one day can change them. Lifetime EXP, current level and consecutive workout days are different measures.</p>",
        ],
        [
          "How do friend search and weekly rankings work?",
          "<p>Search the Friends tab using a nickname prefix or account tag. Tags distinguish users with the same nickname. Global rankings show up to 50 users; weekly rankings start Monday at midnight, Korea time.</p>",
        ],
        [
          "How do Share and Copy link differ?",
          "<p>Workout proof saves today’s record and creates a character image. Share sends that image; Copy link copies the app address. Receiving an app link does not automatically grant access to your private workout records.</p>",
        ],
        [
          "Can I add the app to my Home Screen?",
          "<p>On iPhone, choose Add to Home Screen from Safari’s Share menu. Enable Open as Web App if shown. iPhone push notifications require the Home Screen app. On Android Chrome, use Add to Home screen and choose Install or Create shortcut. Menu wording can vary by browser version.</p>",
        ],
        [
          "Where can I report a problem?",
          '<p>Support: <a href="mailto:wkdeoghq@gmail.com">wkdeoghq@gmail.com</a></p><p>Include the screen and actions involved, the expected and actual results, and your device and browser. Hide email addresses and private conversations in screenshots. Do not send passwords or verification codes.</p>',
        ],
      ],
    },
  },
];
