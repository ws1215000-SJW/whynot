import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

// 6~15% 경계 단계에서 재생할 음원. 파일을 fe/public/sounds/에 넣으세요.
// JavaScript 변수명에는 공백을 사용할 수 없어 '야인시대_기상송'로 표기합니다.
const 야인시대_기상송 = "/sounds/whild_age_wakeup_short.mp3";
const 린_위용 = "/sounds/Lin_siren_vocal.wav";
const 머멧_비명 = "/sounds/screaming-beaver-meme_trimmed.mp3";

const EARTH_IMAGE =
  "https://images.unsplash.com/photo-1645659981907-c2142c0572b9?auto=format&fit=crop&w=1200&q=85";


type SignalType =
  | "CHARGING"
  | "EMERGENCY"
  | "CRITICAL"
  | "WARNING"
  | "CAUTION"
  | "NORMAL";

interface BatteryReport {
  charge: number;
  isCharging: boolean;
  alertCount: number;
  badge: string;
  signal: SignalType;
  shouldAlert: boolean;
  headline: string;
  message: string;
}

type ModalType = "disaster" | "rescue" | "caution" | "charging" | "complete" | "alert";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

function getInitialCharge() {
  const params = new URLSearchParams(window.location.search);
  const sharedParam = params.get("charge");
  const sharedValue = Number(sharedParam);
  if (sharedParam !== null && Number.isFinite(sharedValue) && sharedValue >= 0 && sharedValue <= 100) {
    return Math.round(sharedValue);
  }

  const savedParam = window.localStorage.getItem("shared-charge");
  const savedValue = Number(savedParam);
  return savedParam !== null && Number.isFinite(savedValue) && savedValue >= 0 && savedValue <= 100
    ? Math.round(savedValue)
    : 12;
}

// 백엔드 서버가 꺼져 있을 때도 화면이 깨지지 않도록 동일 기준을 기본값으로 사용
function evaluateFallback(
  charge: number,
  charging: boolean,
  alertCount = 0,
): BatteryReport {
  if (charge === 100) {
    return {
      charge, isCharging: false, alertCount, badge: "복구 완료", signal: "NORMAL",
      shouldAlert: false, headline: "배터리 완전 복구 · 재난 종료 선언",
      message: "100% 도달. 전 대원에게 평화로운 일상을 선포합니다.",
    };
  }

  if (charging) {
    return {
      charge,
      isCharging: true,
      alertCount,
      badge: "구조 완료",
      signal: "CHARGING",
      shouldAlert: false,
      headline: "220V 생명유지장치 연결 확인. 구조대가 철수합니다.",
      message:
        "전력 수혈이 진행 중입니다. 배터리 심박수가 정상으로 회복되고 있습니다.",
    };
  }

  if (charge <= 5) {
    return {
      charge,
      isCharging: false,
      alertCount,
      badge: "재난",
      signal: "EMERGENCY",
      shouldAlert: true,
      headline: "배터리 생존 한계 도달",
      message:
        "배터리 생존 한계 도달. 모든 대원은 즉시 충전 시설을 확보하십시오.",
    };
  }

  if (charge <= 15) {
    return {
      charge,
      isCharging: false,
      alertCount,
      badge: "경계",
      signal: "CRITICAL",
      shouldAlert: true,
      headline: "구조대가 충전기 확보를 요청합니다.",
      message:
        "긴급 상황! 배터리 생존 가능성이 급격히 감소하고 있습니다.",
    };
  }

  if (charge <= 30) {
    return {
      charge,
      isCharging: false,
      alertCount,
      badge: "주의",
      signal: "WARNING",
      shouldAlert: true,
      headline: "전력 고갈 징후 포착",
      message:
        "전력 소비가 통제 범위를 벗어나고 있습니다. 즉시 절전 조치를 시행하십시오.",
    };
  }

  if (charge <= 60) {
    return {
      charge,
      isCharging: false,
      alertCount,
      badge: "양호",
      signal: "CAUTION",
      shouldAlert: false,
      headline: "아직 버틸 만하지만 방심은 금물입니다.",
      message: "외출 전 보조배터리 지참 여부를 재점검하시기 바랍니다.",
    };
  }

  return {
    charge,
    isCharging: false,
    alertCount,
    badge: "평온",
    signal: "NORMAL",
    shouldAlert: false,
    headline: "배터리 생태계가 매우 평화롭습니다.",
    message: "현재 전력 상태 이상 무. 당신의 배터리는 안전한 상태입니다.",
  };
}

export default function App() {
  const [charge, setCharge] = useState(getInitialCharge);
  const [feedback, setFeedback] = useState<"idle" | "copied" | "shared">("idle");
  const [report, setReport] = useState<BatteryReport>(() =>
    evaluateFallback(getInitialCharge(), false, 0),
  );
  const [modal, setModal] = useState<ModalType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [missionSequence, setMissionSequence] = useState(0);
  const previousZone = useRef<string | null>(null);
  const alarmAudio = useRef<HTMLAudioElement | null>(null);
  const level = report.signal;

  function syncAlarm(nextCharge: number, enabled: boolean) {
    const src =
      !enabled || nextCharge === 0
        ? null
        : nextCharge <= 5
          ? 머멧_비명
          : nextCharge <= 15
            ? 린_위용
            : nextCharge <= 30
              ? 야인시대_기상송
              : null;

    const previous = alarmAudio.current;
    if (!src) {
      if (previous) {
        previous.pause();
        previous.currentTime = 0;
      }
      return;
    }

    // 5%와 15% 경계에서 소리가 섞이지 않도록 기존 음원을 먼저 종료
    const nextUrl = new URL(src, window.location.origin).href;
    if (previous && previous.src !== nextUrl) {
      previous.pause();
      previous.currentTime = 0;
      alarmAudio.current = null;
    }

    const audio = alarmAudio.current ?? new Audio(src);
    alarmAudio.current = audio;
    audio.loop = true;
    audio.volume = 0.4;
    if (audio.paused) {
      void audio.play().catch((error) => console.error("경보음 재생 실패:", error));
    }
  }

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    // 버튼 클릭 이벤트 안에서 재생 요청: 모바일 브라우저 자동재생 제한 대응
    syncAlarm(charge, nextEnabled);
    setSoundEnabled(nextEnabled);
  }


  const shareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("charge", String(charge));
    return url.toString();
  }, [charge]);

  useEffect(() => {
    window.localStorage.setItem("shared-charge", String(charge));
    const url = new URL(window.location.href);
    url.searchParams.set("charge", String(charge));
    window.history.replaceState({}, "", url);
  }, [charge]);

  // 네트워크 없이 브라우저에서 위험도를 계산한다.
  useEffect(() => {
    setReport((prev) => evaluateFallback(charge, prev.isCharging, prev.alertCount));
  }, [charge]);

  // 다른 단계에 진입할 때 한 번만 상황 이벤트를 표시한다.
  useEffect(() => {
    const zone = report.isCharging ? "charging" :
      charge === 100 ? "complete" :
      charge <= 5 ? "disaster" :
      charge <= 15 ? "rescue" :
      charge <= 30 ? "caution" : "normal";
    if (previousZone.current === null) {
      previousZone.current = zone;
      if (zone === "disaster" && charge > 0) setModal("disaster");
      return;
    }
    if (previousZone.current !== zone) {
      previousZone.current = zone;
      if (charge === 0) {
        setModal(null);
      } else if (zone !== "normal") {
        setModal(zone as Exclude<ModalType, "alert">);
      } else {
        setModal(null);
      }
    }
  // soundEnabled 변화 자체가 경고 팝업을 발생시키지 않도록 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge, report.isCharging]);

  useEffect(() => {
    if (!dispatching) return;
    const timer = window.setTimeout(() => setDispatching(false), 2400);
    return () => window.clearTimeout(timer);
  }, [dispatching]);

  // 6~15%: 야인시대_기상송 반복 / 1~5%: 비버 비명 반복 / 0%: 즉시 정지
  useEffect(() => {
    syncAlarm(charge, soundEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge, soundEnabled]);

  useEffect(() => {
    return () => {
      const audio = alarmAudio.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = window.setTimeout(() => setFeedback("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function toggleCharger() {
    // 시연용 즉시 충전: 장시간 대기 없이 100%가 되고 재난이 종료된다.
    syncAlarm(100, soundEnabled);
    setCharge(100);
    setReport((prev) => evaluateFallback(100, false, prev.alertCount));
    setModal("complete");
    setDispatching(false);
    setMissionSequence((value) => value + 1);
  }

  function sendEmergencyAlert() {
    // 실제 문자나 외부 구조대를 호출하지 않는 패러디 시뮬레이션.
    setReport((prev) => evaluateFallback(charge, prev.isCharging, prev.alertCount + 1));
    setModal("alert");
    setDispatching(true);
    setMissionSequence((value) => value + 1);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("copied");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setFeedback("copied");
    }
  }

  async function shareCharge() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `[${report.badge}] 나의 배터리 ${charge}%`,
          text: `${report.headline} (현재 에너지 ${charge}%)`,
          url: shareUrl,
        });
        setFeedback("shared");
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  }

  const pillClass =
    report.signal === "CHARGING"
      ? "charging"
      : report.signal === "EMERGENCY" || report.signal === "CRITICAL"
        ? "critical"
        : report.signal === "WARNING"
          ? "warning"
          : "";

  return (
    <main className={`app-shell theme-${level.toLowerCase()}`}>
      {level === "EMERGENCY" && <div className="disaster-overlay" aria-hidden="true" />}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="showcase" aria-labelledby="page-title">
        <div className="intro">
          <div className="eyebrow">
            <span className="live-dot" />
            BATTERY RESCUE HQ
          </div>
          <h1 id="page-title">
            지금의 에너지를
            <br />
            <span>친구와 나눠보세요.</span>
          </h1>
          <p>
            게이지를 움직여 현재 상태를 남기세요.
            <br className="desktop-break" /> 배터리 수치를 분석해 구조본부가 경보 시그널을 발령합니다.
          </p>

          <div className="share-card">
            <div className="share-card-top">
              <div>
                <span className="card-label">공유할 에너지</span>
                <strong>{charge}%</strong>
              </div>
              <div className={`state-pill ${pillClass}`}>
                <span />
                {report.badge} · {report.signal}
              </div>
            </div>

            <div
              className={`rescue-box ${report.shouldAlert ? "is-urgent" : ""}`}
              role="status"
              aria-live="polite"
            >
              <div className="rescue-box-top">
                <span className="rescue-tag">구조본부 판정 시그널</span>
                <span className="api-badge online">실시간 자체 관제 중</span>
              </div>
              <strong className="rescue-headline">{report.headline}</strong>
              <p className="rescue-message">{report.message}</p>
              {level === "WARNING" && (
                <div className="energy-monitor">
                  <span>전력 소비량 감시 · 앱 종료 권고</span>
                  <div className="energy-bars" aria-label="가상 소비량 그래프">
                    {[25, 52, 35, 75, 45, 90, 62, 82, 55, 98, 73, 86].map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              )}
              {level === "CRITICAL" && (
                <div className="dispatch-status"><span className="signal-pulse" /> 구조대 긴급 통신 중 · 충전기 탐색 레이더 가동</div>
              )}
              {(level === "CHARGING" || (charge === 100 && !report.isCharging)) && (
                <div className="mission-stamp">{level === "CHARGING" ? "구조 성공" : "재난 종료"}</div>
              )}

              <div className="rescue-actions">
                <button
                  type="button"
                  className={`rescue-btn ${report.isCharging ? "active" : ""}`}
                  onClick={toggleCharger}
                >
                  ⚡ 충전기 연결 · 즉시 100%
                </button>
                <button
                  type="button"
                  className="rescue-btn alert-btn"
                  onClick={sendEmergencyAlert}
                >
                  {dispatching ? "📡 가상 호출 성공" : `📡 긴급 알림 발송 (${report.alertCount}회)`}
                </button>
              </div>
            </div>

            <button type="button" className="sound-toggle" onClick={toggleSound}>
              {soundEnabled ? "🔊 경보음 켜짐 (끄기)" : "🔇 경보음 켜기"}
            </button>

            <div className="link-box" title={shareUrl}>
              <span>{shareUrl}</span>
              <button onClick={copyLink} aria-label="공유 링크 복사">
                {feedback === "copied" ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>

            <button className="share-button" onClick={shareCharge}>
              <ShareIcon />
              {feedback === "shared"
                ? "공유했어요"
                : feedback === "copied"
                  ? "링크를 복사했어요"
                  : "친구에게 공유하기"}
            </button>
            <p className="save-note">
              <CheckIcon />
              변경한 값은 이 기기에도 자동으로 저장됩니다
            </p>
          </div>
        </div>

        <div className="device-stage">
          <div
            className={`phone ${level === "EMERGENCY" && charge > 0 ? "phone-disaster" : ""}`}
            style={{ "--charge": `${charge}%` } as CSSProperties}
          >
            <div className="phone-screen">
              <img className="earth-image" src={EARTH_IMAGE} alt="" />
              <div className="screen-vignette" />
              <div className="red-glow" />
              {level === "EMERGENCY" && <div className="screen-noise" aria-hidden="true" />}
              {level === "CRITICAL" && (
                <div className="rescue-radar" aria-label="구조대 충전기 위치 추적 중"><span /></div>
              )}
              {charge === 100 && <div className="charge-success">✓ 배터리 완전 복구 · 재난 종료</div>}
              {(charge <= 15 && charge < 100) && (
                <div className="mission-ops" aria-hidden="true" key={missionSequence}>
                  <span className="ops-topline">⚠ BATTERY DEFENSE COMMAND · TOP SECRET</span>
                  <span className="ops-aircraft">✈</span>
                  <span className="ops-soldier">🪖</span>
                  <span className="ops-caption">충전 특수부대 출격 승인</span>
                </div>
              )}

              <div className="status-bar" aria-hidden="true">
                <span>14:27</span>
                <div className="dynamic-island" />
                <div className="status-icons">
                  <i className="signal" />
                  <i className="wifi" />
                  <i className="mini-battery" />
                </div>
              </div>

              <div
                className={`phone-alert ${report.shouldAlert ? "urgent" : ""}`}
              >
                <span className="phone-alert-badge">[{report.badge}]</span>
                <p>{report.headline}</p>
              </div>

              <div className="battery-wrap" aria-label={`현재 에너지 ${charge}%`}>
                <div className="battery">
                  <div className="battery-level" />
                  <strong>{charge}%</strong>
                </div>
                <div className="battery-tip" />
              </div>

              <div className="app-dock" aria-hidden="true">
                <div className="app-item">
                  <div className="app-icon kakao-icon">
                    <span className="kakao-bubble">TALK</span>
                  </div>
                  <span>카카오톡</span>
                </div>
                <div className="app-item">
                  <div className="app-icon youtube-icon">
                    <span className="youtube-play" />
                  </div>
                  <span>YouTube</span>
                </div>
                <div className="app-item">
                  <div className="app-icon instagram-icon">
                    <span className="instagram-camera">
                      <i />
                    </span>
                  </div>
                  <span>Instagram</span>
                </div>
              </div>
              <div className="home-indicator" />
              {charge === 0 && (
                <div className="phone-powered-off" role="status" aria-label="배터리가 0퍼센트라 휴대폰 화면이 꺼졌습니다" />
              )}
              {charge > 0 && modal && (
                <div className="phone-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
                  <div
                    className={`emergency-modal modal-${modal}`}
                    role="alertdialog"
                    aria-modal="true"
                    aria-label="배터리 작전 상황 안내"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="military-header">🔴 국가 배터리 방위 사령부</div>
                    <div className="soldier-portrait" aria-hidden="true">
                      <span className="soldier-emoji">🪖</span>
                      <div><strong>충전 특수작전단</strong><small>작전명: 콘센트 확보</small></div>
                    </div>
                    <div className="jet-scene" aria-hidden="true"><span>✈</span><i>⚡ ⚡ ⚡</i></div>
                    <strong className="mission-title">{modal === "disaster" ? "🚨 국가 전력 재난 선포" : modal === "rescue" ? "🪖 충전 특공대 긴급 출격" : modal === "caution" ? "⚠ 전력관리본부 비상 회의" : modal === "charging" || modal === "complete" ? "🏅 작전 성공 · 재난 해제" : "📡 가상 구조 요청 접수"}</strong>
                    <p>{modal === "disaster" ? "잔량 5% 이하! 전 장병은 보조배터리를 사수하라. 마지막 콘센트까지 포기하지 않는다!" : modal === "rescue" ? "충전기 수색 작전 개시! USB-C 수색견 및 전투기 편대 출격 준비 완료." : modal === "caution" ? "긴급 예산 0원 편성. 유튜브와 릴스부터 우선 진압하라는 명령이 하달되었습니다." : modal === "charging" || modal === "complete" ? "충전기 접촉 성공! 배터리 100%. 전군 환호. 콘센트 수호자에게 훈장을 수여합니다." : `가상 구조대에 SOS 신호를 보낸 척했습니다. 누적 ${report.alertCount}회! 실제 문자·신고는 발송되지 않습니다.`}</p>
                    <button type="button" onClick={() => setModal(null)}>명령 확인 · 작전 복귀</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="control-panel">
            <div className="control-header">
              <label htmlFor="charge-control">에너지 게이지</label>
              <output htmlFor="charge-control">{charge}%</output>
            </div>
            <div className="range-wrap">
              <input
                id="charge-control"
                type="range"
                min="0"
                max="100"
                value={charge}
                onChange={(event) => {
                  const nextCharge = Number(event.target.value);
                  syncAlarm(nextCharge, soundEnabled);
                  setCharge(nextCharge);
                }}
                style={{ "--charge": `${charge}%` } as CSSProperties}
                aria-valuetext={`${charge}퍼센트`}
              />
            </div>
            <div className="range-labels" aria-hidden="true">
              <span>LOW</span>
              <span>FULL</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
