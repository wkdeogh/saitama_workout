import { t } from "../i18n/index.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  MessageCircle,
  Send,
  X,
  Users,
  Footprints,
  PersonStanding,
  Dumbbell,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import { createFieldScene } from "./fieldScene";
import { connectField, fieldConnectionError } from "./fieldClient";
import { cleanChat, CHAT_COOLDOWN, CHAT_MAX_LENGTH } from "./fieldModel";
function Joystick({ controls }) {
  const pointer = useRef(null);
  const [knob, setKnob] = useState({
    x: 0,
    y: 0,
  });
  function update(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - rect.left - rect.width / 2) / 38;
    let y = (event.clientY - rect.top - rect.height / 2) / 38;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    controls.joystick = {
      x,
      y,
    };
    setKnob({
      x: x * 30,
      y: y * 30,
    });
  }
  function release(event) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    controls.joystick = {
      x: 0,
      y: 0,
    };
    setKnob({
      x: 0,
      y: 0,
    });
  }
  useEffect(() => {
    const reset = () => {
      pointer.current = null;
      controls.joystick = {
        x: 0,
        y: 0,
      };
      setKnob({
        x: 0,
        y: 0,
      });
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [controls]);
  return (
    <div
      className="field-joystick"
      aria-label={t("이동 조이스틱")}
      role="group"
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) update(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="field-joystick-cross" aria-hidden="true" />
      <span
        className="field-joystick-knob"
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
export default function OutdoorWorld({ user, name, level, streak, onClose }) {
  const host = useRef(null),
    labels = useRef(null),
    dialog = useRef(null),
    input = useRef(null);
  const runtime = useRef(null),
    connection = useRef(null),
    retryButton = useRef(null);
  const controls = useRef({
    keys: new Set(),
    joystick: {
      x: 0,
      y: 0,
    },
    running: false,
    typing: false,
    cameraYaw: 0,
    cameraPitch: 0.36,
    now: () => Date.now(),
    player: {
      name: name || t("비회원"),
      level,
      streak,
      guest: !user,
      x: (Math.random() - 0.5) * 2,
      z: 8 + Math.random(),
      yaw: Math.PI,
      action: "idle",
      chat: "",
      chatAt: 0,
    },
  }).current;
  const [action, setAction] = useState("idle"),
    [running, setRunning] = useState(false);
  const [status, setStatus] = useState({
    state: "connecting",
    message: "공유 서버에 연결 중…",
  });
  const [count, setCount] = useState(0),
    [attempt, setAttempt] = useState(0),
    [sceneError, setSceneError] = useState("");
  const [chatOpen, setChatOpen] = useState(false),
    [chat, setChat] = useState(""),
    [chatError, setChatError] = useState("");
  const [help, setHelp] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  function exercise(value) {
    controls.player.action = controls.player.action === value ? "idle" : value;
    setAction(controls.player.action);
    connection.current?.publish(controls.player, true);
  }
  function toggleRun() {
    controls.running = !controls.running;
    setRunning(controls.running);
  }
  useEffect(() => {
    const previousFocus = document.activeElement;
    const root = document.getElementById("root"),
      previousInert = root?.inert;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (root) root.inert = true;
    dialog.current.focus();
    const editable = (target) =>
      target instanceof HTMLElement &&
      (target.matches("input,textarea,select") || target.isContentEditable);
    function keydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (controls.typing) input.current?.blur();
        else closeRef.current();
        return;
      }
      if (event.key === "Tab") {
        const buttons = [
          ...dialog.current.querySelectorAll(
            'button:not([disabled]),input:not([disabled]),[tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length);
        const first = buttons[0],
          last = buttons.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
        return;
      }
      if (
        editable(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)) {
        event.preventDefault();
        controls.keys.add(event.code);
      }
      if (event.code === "KeyQ") {
        event.preventDefault();
        controls.cameraYaw += 0.12;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        controls.cameraYaw -= 0.12;
      }
      if (!event.repeat && event.code === "KeyR") toggleRun();
      if (
        !event.repeat &&
        event.code === "Enter" &&
        event.target === dialog.current
      ) {
        event.preventDefault();
        setChatOpen(true);
      }
    }
    const keyup = (event) => controls.keys.delete(event.code);
    const reset = () => {
      controls.keys.clear();
      controls.joystick = {
        x: 0,
        y: 0,
      };
      if (["walk", "run"].includes(controls.player.action)) {
        controls.player.action = "idle";
        setAction("idle");
        connection.current?.publish(controls.player, true);
      }
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
      document.body.style.overflow = overflow;
      if (root) root.inert = previousInert;
      previousFocus?.focus?.();
    };
  }, [controls]);
  useEffect(() => {
    try {
      runtime.current = createFieldScene(
        host.current,
        labels.current,
        controls,
        {
          onFrame: (player) => connection.current?.publish(player),
          onAction: setAction,
          onError: setSceneError,
        },
      );
    } catch {
      setSceneError(
        "이 기기에서 3D 화면을 시작하지 못했어요. 다른 브라우저에서 다시 입장해 주세요.",
      );
    }
    return () => {
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [controls]);
  useEffect(() => {
    const abort = new AbortController();
    if (sceneError) return;
    let timer;
    setStatus({
      state: "connecting",
      message: "공유 서버에 연결 중…",
    });
    timer = setTimeout(() => {
      if (!abort.signal.aborted)
        setStatus((current) =>
          current.state === "online" || current.state === "error"
            ? current
            : {
                state: "offline",
                message:
                  "공유 서버 연결이 지연되고 있어요. 다시 연결할 수 있어요.",
              },
        );
    }, 10000);
    connectField({
      user,
      initial: controls.player,
      signal: abort.signal,
      onPlayers: (players, key) => {
        runtime.current?.setPlayers(players, key);
        setCount(Object.keys(players).length);
      },
      onStatus: (next) => {
        if (!abort.signal.aborted)
          setStatus((current) =>
            current.state === next.state && current.message === next.message
              ? current
              : next,
          );
      },
    })
      .then((client) => {
        if (abort.signal.aborted) {
          client?.close();
          return;
        }
        connection.current = client;
        if (client) controls.now = client.now;
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setStatus({
            state: "error",
            message: fieldConnectionError(error),
          });
      });
    return () => {
      clearTimeout(timer);
      abort.abort();
      connection.current?.close();
      connection.current = null;
      controls.now = () => Date.now();
    };
  }, [attempt, controls, user, sceneError]);
  useEffect(() => {
    if (chatOpen) input.current?.focus();
  }, [chatOpen]);
  useEffect(() => {
    if (!chatOpen || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      if (inset > 80)
        dialog.current?.style.setProperty(
          "--field-chat-bottom",
          `${inset + 12}px`,
        );
      else dialog.current?.style.removeProperty("--field-chat-bottom");
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      dialog.current?.style.removeProperty("--field-chat-bottom");
    };
  }, [chatOpen]);
  useEffect(() => {
    if (status.state !== "online") {
      runtime.current?.setPlayers({}, "");
      setCount(0);
    }
  }, [status.state]);
  function send(event) {
    event.preventDefault();
    const text = cleanChat(chat),
      now = controls.now();
    if (!text) return;
    if (status.state !== "online") {
      setChatError("공유 서버 연결 후 대화할 수 있어요.");
      return;
    }
    if (now - controls.player.chatAt < CHAT_COOLDOWN) {
      setChatError("잠시 후 다시 보내주세요.");
      return;
    }
    controls.player = {
      ...controls.player,
      chat: text,
      chatAt: now,
    };
    connection.current?.publish(controls.player, true);
    setChat("");
    setChatError("");
    input.current?.blur();
    controls.typing = false;
    setChatOpen(false);
    dialog.current?.focus();
  }
  return createPortal(
    <div
      className="field-world"
      role="dialog"
      aria-modal="true"
      aria-label={t("야외 훈련장")}
      tabIndex={-1}
      ref={dialog}
    >
      <div className="field-canvas" ref={host} />
      <div className="field-labels" ref={labels} aria-hidden="true" />
      <div className="field-topbar">
        <div className="field-world-title">
          <strong>{t("야외 훈련장")}</strong>
          <span>
            <i className={status.state === "online" ? "online" : ""} />
            <Users size={13} aria-hidden="true" />{" "}
            {status.state === "online"
              ? t("{0}명 접속", {
                  0: count,
                })
              : t("연결 대기")}
          </span>
        </div>
        <button className="field-exit" onClick={onClose}>
          <LogOut size={17} aria-hidden="true" />
          {t(" 나가기")}
        </button>
      </div>
      {(status.state !== "online" || sceneError) && (
        <div className="field-connection" role="status">
          <span>{t(sceneError || status.message)}</span>
          {!sceneError && ["error", "offline"].includes(status.state) && (
            <button
              ref={retryButton}
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t("다시 연결")}
            </button>
          )}
        </div>
      )}
      <div className="field-camera-tools">
        <button
          aria-label={t("시점 왼쪽으로 회전")}
          onClick={() => {
            controls.cameraYaw += 0.35;
          }}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          aria-label={t("시점 오른쪽으로 회전")}
          onClick={() => {
            controls.cameraYaw -= 0.35;
          }}
        >
          <ChevronRight size={19} />
        </button>
        <button
          aria-label={t("캐릭터 뒤로 시점 복귀")}
          onClick={() => {
            controls.cameraYaw = controls.player.yaw - Math.PI;
            controls.cameraPitch = 0.36;
          }}
        >
          <RotateCcw size={17} />
        </button>
        <button
          aria-label={t("조작 방법")}
          aria-expanded={help}
          onClick={() => setHelp(!help)}
        >
          <CircleHelp size={18} />
        </button>
      </div>
      {help && (
        <div className="field-help">
          <span>{t("이동: WASD · 방향키 · 조이스틱")}</span>
          <span>{t("시점: 화면 드래그 · Q / E")}</span>
          <span>{t("달리기: 버튼 · R")}</span>
          <span>{t("운동 중 이동하면 동작이 멈춰요.")}</span>
        </div>
      )}
      <div className="field-bottom-controls">
        <Joystick controls={controls} />
        <button
          className="field-chat-toggle"
          aria-label={t("채팅 열기")}
          aria-expanded={chatOpen}
          onClick={() => {
            setChatOpen(!chatOpen);
            setChatError("");
          }}
        >
          <MessageCircle size={23} />
        </button>
        <div className="field-actions">
          <div className="field-exercises">
            <button
              aria-pressed={action === "pushup"}
              onClick={() => exercise("pushup")}
            >
              <Dumbbell size={20} aria-hidden="true" />
              <span>{t("푸쉬업")}</span>
            </button>
            <button
              aria-pressed={action === "squat"}
              onClick={() => exercise("squat")}
            >
              <PersonStanding size={22} aria-hidden="true" />
              <span>{t("스쿼트")}</span>
            </button>
          </div>
          <button
            className="field-run"
            aria-pressed={running}
            onClick={toggleRun}
          >
            <Footprints size={19} aria-hidden="true" />
            <span>
              {t("달리기 ")}
              {running ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>
      {chatOpen && (
        <form className="field-chat-form" onSubmit={send}>
          <label className="field-sr-only" htmlFor="field-chat-input">
            {t("말풍선 메시지")}
          </label>
          <input
            ref={input}
            id="field-chat-input"
            value={chat}
            maxLength={CHAT_MAX_LENGTH}
            placeholder={t("함께 있는 사람들에게 한마디")}
            autoComplete="off"
            onFocus={() => {
              controls.typing = true;
              controls.keys.clear();
              controls.joystick = {
                x: 0,
                y: 0,
              };
            }}
            onBlur={() => {
              controls.typing = false;
            }}
            onChange={(event) => {
              setChat(event.target.value);
              setChatError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.nativeEvent.isComposing)
                event.preventDefault();
            }}
          />
          <button
            aria-label={t("메시지 보내기")}
            type="submit"
            disabled={!chat.trim() || status.state !== "online"}
          >
            <Send size={19} />
          </button>
          <button
            aria-label={t("채팅 닫기")}
            type="button"
            onClick={() => {
              setChatOpen(false);
              controls.typing = false;
              dialog.current?.focus();
            }}
          >
            <X size={19} />
          </button>
          {chatError && (
            <span className="field-chat-error" role="status">
              {t(chatError)}
            </span>
          )}
        </form>
      )}
      <span className="field-sr-only" aria-live="polite">
        {action === "pushup"
          ? t("푸쉬업 중")
          : action === "squat"
            ? t("스쿼트 중")
            : ""}
      </span>
    </div>,
    document.body,
  );
}
