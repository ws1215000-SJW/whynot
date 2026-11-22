import { type CSSProperties, useEffect, useMemo, useState } from "react";

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
  const sharedValue = Number(params.get("charge"));
  if (Number.isFinite(sharedValue) && sharedValue >= 1 && sharedValue <= 100) {
    return Math.round(sharedValue);
  }

  const savedValue = Number(window.localStorage.getItem("shared-charge"));
  return Number.isFinite(savedValue) && savedValue >= 1 && savedValue <= 100
    ? Math.round(savedValue)
    : 12;
}

// 백엔드 서버가 꺼져 있을 때도 화면이 깨지지 않도록 동일 기준을 기본값으로 사용
function evaluateFallback(
  charge: number,
  charging: boolean,
  alertCount = 0,
): BatteryReport {
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
      headline: "메이데이! 전원 사망 1분 전, 유언을 저장하십시오!",
      message:
        "최후 교신입니다. 즉시 충전기를 꽂지 않으면 모든 디지털 기억이 암전됩니다.",
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
        "긴급 상황!! 배터리 생존 가능성이 급격히 감소하고 있습니다. 구조대 출동.",
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
      headline: "전력 고갈 징후 포착! 반경 15m 내 콘센트를 수색하십시오.",
      message:
        "제1배터리탐색구조대 출동 대기 중. 불필요한 유튜브·인스타 배터리 생존 위협 요소를 종료하세요.",
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

  // 슬라이더 값(charge)이 바뀔 때마다 백엔드(/api/battery)로 보내 경고 시그널 수신
  
  // 배터리 잔량이 변경되면 FE에서 직접 경고 단계 계산
  useEffect(() => {
    setReport((prev) =>
      evaluateFallback(
        charge,
        prev.isCharging,
        prev.alertCount
      )
    );
  }, [charge]);

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = window.setTimeout(() => setFeedback("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function toggleCharger() {
  setReport((prev) =>
    evaluateFallback(
      charge,
      !prev.isCharging,
      prev.alertCount
    )
  );
}


  function sendEmergencyAlert() {
    setReport((prev) =>
      evaluateFallback(
        charge,
        prev.isCharging,
        prev.alertCount + 1
      )
    );
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
    <main className="app-shell">
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
              </div>
              <strong className="rescue-headline">{report.headline}</strong>
              <p className="rescue-message">{report.message}</p>

              <div className="rescue-actions">
                <button
                  type="button"
                  className={`rescue-btn ${report.isCharging ? "active" : ""}`}
                  onClick={toggleCharger}
                >
                  {report.isCharging ? "충전기 분리" : "충전기 연결"}
                </button>
                <button
                  type="button"
                  className="rescue-btn alert-btn"
                  onClick={sendEmergencyAlert}
                >
                  긴급 알림 발송 ({report.alertCount}건)
                </button>
              </div>
            </div>

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
            className="phone"
            style={{ "--charge": `${charge}%` } as CSSProperties}
          >
            <div className="phone-screen">
              <img className="earth-image" src={EARTH_IMAGE} alt="" />
              <div className="screen-vignette" />
              <div className="red-glow" />

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
                min="1"
                max="100"
                value={charge}
                onChange={(event) => setCharge(Number(event.target.value))}
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
