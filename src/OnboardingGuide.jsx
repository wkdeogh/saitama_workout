import { useEffect, useRef, useState } from "react";
import {
  Dumbbell,
  Sparkles,
  Trophy,
  Camera,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { swipePage } from "./onboardingModel";

const pages = [
  {
    title: "운동 입력과 목표",
    icon: Dumbbell,
    content: (
      <>
        <div className="guide-goals">
          {[
            ["푸쉬업", "100개"],
            ["스쿼트", "100개"],
            ["기타운동", "100개"],
            ["달리기", "10km"],
          ].map(([name, count]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
        <p>
          오늘 운동한 만큼 입력하고 <strong>기록 저장</strong>을 누르세요. 기본
          목표는 설정에서 바꿀 수 있습니다.
        </p>
        <p>
          비슷한 다른 운동으로 대체해도 됩니다. 실제로 수행한 횟수나 거리를 해당
          운동 항목에 기록하세요.
        </p>
        <p className="help-honesty">
          양심껏.
          <br />
          실제로 운동한 만큼만 입력하시오.
        </p>
      </>
    ),
  },
  {
    title: "EXP와 캐릭터 성장",
    icon: Sparkles,
    content: (
      <>
        <div className="guide-highlight">
          <strong>100 EXP</strong>
          <span>마다 1레벨 상승 · 최대 LV. 1000</span>
        </div>
        <ul>
          <li>
            푸쉬업·스쿼트·기타운동 <strong>1개 = 1 EXP</strong>
          </li>
          <li>
            달리기 <strong>0.1km = 2 EXP</strong>
          </li>
          <li>목표를 채우지 못해도 실제 운동량만큼 EXP가 쌓입니다.</li>
        </ul>
        <p>
          운동 없이 5일이 지나면 <strong>1레벨 감소</strong>하고, 이후에는 매일
          1레벨씩 감소합니다. 운동을 다시 기록하면 5일 카운트가 초기화되며, 최저
          레벨은 1입니다.
        </p>
        <p>
          <strong>레벨 보상</strong> · 레벨이 오르면 체형이 성장하고,
          머리·의상과 에너지 링·번개·주먹 효과가 단계별로 열립니다. 성장
          도감에서 확인하세요.
        </p>
        <p>
          <strong>연속 운동 보상</strong> · 목표를 채우지 않아도 조금이라도
          운동을 기록하면 이어집니다. 10일마다 오라와 랭킹 이름 반짝임이
          1단계씩, 60일부터 최대 6단계까지 적용됩니다. 30일부터 불꽃 눈,
          50일부터 청록색 불꽃 눈이 나타납니다.
        </p>
        <p>
          연속 일수는 2일부터 표시되며, 하루를 건너뛰면 연속 보상이
          초기화됩니다. 레벨로 얻은 외형과 효과는 현재 레벨에 따라 유지됩니다.
        </p>
      </>
    ),
  },
  {
    title: "친구와 랭킹",
    icon: Trophy,
    content: (
      <>
        <ol>
          <li>
            친구 탭에서 <strong>닉네임 앞부분 또는 계정 태그</strong>로
            검색합니다.
          </li>
          <li>친구 요청을 보내고, 받은 요청은 수락·거절합니다.</li>
          <li>
            <strong>전체 랭킹 / 친구 랭킹</strong>을 선택해 순위를 확인합니다.
          </li>
        </ol>
        <p>
          랭킹은 누적·주간 EXP 기준이며 같은 EXP는 공동 순위입니다. 전체 랭킹은
          상위 50명, 주간은 한국 시간 월요일 0시부터 계산합니다.
        </p>
        <p>
          유저를 누르면 캐릭터·레벨·누적 운동량과 오늘 운동량이 보입니다.
          이메일과 과거 날짜별 기록은 공개되지 않습니다.
        </p>
        <p>
          친구 요청 푸시는 <strong>알림 켜기</strong>에서 허용하세요. 아이폰은
          홈 화면에 추가한 앱에서 설정합니다.
        </p>
      </>
    ),
  },
  {
    title: "오늘의 훈련 공유",
    icon: Camera,
    content: (
      <>
        <div className="guide-highlight">
          <strong>오운완</strong>
          <span>오늘의 훈련 → 기록 저장 옆 버튼</span>
        </div>
        <ol>
          <li>
            오늘의 운동 기록을 입력하고 <strong>오운완</strong>을 누릅니다. 수정
            중인 기록도 먼저 저장됩니다.
          </li>
          <li>날짜·캐릭터·종목별 운동량이 이미지 한 장으로 만들어집니다.</li>
          <li>
            <strong>다른 포즈</strong>로 바꿔 보거나{" "}
            <strong>이미지 저장·공유</strong>를 선택하세요.
          </li>
        </ol>
        <p>공유 메시지에는 닉네임, 날짜, 운동량과 앱 주소가 함께 들어갑니다.</p>
      </>
    ),
  },
  {
    title: "아이폰 홈 화면에 추가",
    icon: Smartphone,
    content: (
      <>
        <ol>
          <li>
            <strong>Safari</strong>에서 싸이따마훈련소를 엽니다.
          </li>
          <li>
            <strong>공유 버튼</strong>을 누릅니다. 메뉴 안에 있을 수도 있습니다.
          </li>
          <li>
            <strong>홈 화면에 추가</strong>를 선택합니다.
          </li>
          <li>
            ‘웹 앱으로 열기’가 보이면 켜고 <strong>추가</strong>를 누릅니다.
          </li>
        </ol>
        <p>
          홈 화면 아이콘으로 실행한 뒤 로그인이 다시 필요할 수 있습니다. 친구
          탭에서 알림을 허용하면 친구 요청 푸시를 받을 수 있습니다.
        </p>
        <a
          href="https://support.apple.com/ko-kr/guide/iphone/iphea86e5236/ios"
          target="_blank"
          rel="noreferrer"
        >
          Apple 안내
        </a>
      </>
    ),
  },
  {
    title: "갤럭시 홈 화면에 추가",
    icon: Smartphone,
    content: (
      <>
        <p>
          <strong>Chrome</strong>
        </p>
        <ol>
          <li>Chrome에서 싸이따마훈련소를 엽니다.</li>
          <li>
            오른쪽 위 <strong>⋮ → 홈 화면에 추가</strong>를 누릅니다.
          </li>
          <li>
            <strong>설치</strong> 또는 <strong>바로가기 만들기</strong>를
            선택합니다.
          </li>
        </ol>
        <p>
          <strong>삼성 인터넷</strong>
          <br />
          메뉴 ☰ → 현재 페이지 추가 → 홈 화면 → 추가. 버전에 따라 ‘홈 화면에
          추가’로 표시됩니다.
        </p>
        <p>
          카카오톡 등 앱 안에서 메뉴가 보이지 않으면 Safari·Chrome·삼성
          인터넷으로 다시 열어 주세요.
        </p>
        <a
          href="https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=ko"
          target="_blank"
          rel="noreferrer"
        >
          Chrome 안내
        </a>
      </>
    ),
  },
];

export default function OnboardingGuide({ onClose }) {
  const [page, setPage] = useState(0),
    [direction, setDirection] = useState(1);
  const touch = useRef(null),
    area = useRef(null);
  useEffect(() => {
    area.current?.scrollTo({ top: 0 });
  }, [page]);
  const current = pages[page],
    Icon = current.icon;
  function go(next) {
    const bounded = Math.max(0, Math.min(pages.length - 1, next));
    if (bounded === page) return;
    setDirection(bounded > page ? 1 : -1);
    setPage(bounded);
  }
  return (
    <div
      className="onboarding-guide"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          go(page + (e.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <div
        className="guide-progress"
        aria-label={`${pages.length}페이지 중 ${page + 1}페이지`}
      >
        {pages.map((item, index) => (
          <span key={item.title} className={index <= page ? "filled" : ""} />
        ))}
        <strong>
          {page + 1} / {pages.length}
        </strong>
      </div>
      <div
        className="guide-swipe"
        ref={area}
        role="region"
        aria-label={current.title}
        tabIndex={0}
        aria-live="polite"
        aria-atomic="true"
        onPointerDown={(e) => {
          if (e.button === 0 && !e.target.closest("a,button"))
            touch.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const change = swipePage(touch.current, {
            x: e.clientX,
            y: e.clientY,
          });
          touch.current = null;
          if (change) go(page + change);
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
      >
        <section
          key={page}
          className={`guide-page ${direction > 0 ? "from-right" : "from-left"}`}
        >
          <div className="guide-icon">
            <Icon size={28} aria-hidden="true" />
          </div>
          <h3>{current.title}</h3>
          {current.content}
        </section>
      </div>
      <div className="guide-navigation">
        <button
          className="secondary-button"
          disabled={page === 0}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          이전
        </button>
        <button
          className="primary-button"
          onClick={() => (page === pages.length - 1 ? onClose() : go(page + 1))}
        >
          {page === pages.length - 1 ? (
            <>
              완료
              <Check size={18} aria-hidden="true" />
            </>
          ) : (
            <>
              다음
              <ChevronRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
