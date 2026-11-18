import { useEffect, useMemo, useState } from "react";

const EARTH_IMAGE =
  "https://images.unsplash.com/photo-1645659981907-c2142c0572b9?auto=format&fit=crop&w=1200&q=85";

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

export default function App() {
  const [charge, setCharge] = useState(getInitialCharge);
  const [feedback, setFeedback] = useState<"idle" | "copied" | "shared">("idle");

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

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = window.setTimeout(() => setFeedback("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

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
          title: `나의 에너지 ${charge}%`,
          text: `지금 내 에너지는 ${charge}%예요. 링크를 열어 확인해 보세요.`,
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

  const status =
    charge <= 20 ? "충전이 필요해요" : charge <= 60 ? "조금 더 갈 수 있어요" : "에너지가 충분해요";

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="showcase" aria-labelledby="page-title">
        <div className="intro">
          <div className="eyebrow">
            <span className="live-dot" />
            LIVE ENERGY
          </div>
          <h1 id="page-title">
            지금의 에너지를
            <br />
            <span>친구와 나눠보세요.</span>
          </h1>
          <p>
            게이지를 움직여 현재 상태를 남기세요.
            <br className="desktop-break" /> 링크를 받은 친구는 같은 수치를 바로 확인할 수 있어요.
          </p>

          <div className="share-card">
            <div className="share-card-top">
              <div>
                <span className="card-label">공유할 에너지</span>
                <strong>{charge}%</strong>
              </div>
              <div className={`state-pill ${charge <= 20 ? "critical" : ""}`}>
                <span />
                {status}
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
          <div className="phone" style={{ "--charge": `${charge}%` } as React.CSSProperties}>
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
                style={{ "--charge": `${charge}%` } as React.CSSProperties}
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
