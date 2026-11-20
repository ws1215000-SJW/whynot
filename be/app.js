const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 프론트엔드(fe)에서 보내는 요청과 JSON 데이터를 받을 수 있게 허용
app.use(cors());
app.use(express.json());

// 서버에 기억해 둘 상태 (기획서의 '발송된 경고 메시지 건수' & '충전기 연결 여부')
let alertCount = 0;
let isCharging = false;

// 배터리 숫자(1~100)를 보고 위험 등급과 '쓸데없이 진지한 경고 메시지'를 판단하는 함수
function evaluateBattery(charge, charging) {
  if (charging) {
    return {
      badge: '구조 완료',
      signal: 'CHARGING',
      shouldAlert: false,
      headline: '220V 생명유지장치 연결 확인. 구조대가 철수합니다.',
      message: '전력 수혈이 진행 중입니다. 배터리 심박수가 정상으로 회복되고 있습니다.',
    };
  }

  if (charge <= 5) {
    return {
      badge: '재난',
      signal: 'EMERGENCY',
      shouldAlert: true,
      headline: '메이데이! 전원 사망 1분 전, 유언을 저장하십시오!',
      message: '최후 교신입니다. 즉시 충전기를 꽂지 않으면 모든 디지털 기억이 암전됩니다.',
    };
  }

  if (charge <= 15) {
    return {
      badge: '경계',
      signal: 'CRITICAL',
      shouldAlert: true,
      headline: '구조대가 충전기 확보를 요청합니다.',
      message: '긴급 상황!! 배터리 생존 가능성이 급격히 감소하고 있습니다. 구조대 출동.',
    };
  }

  if (charge <= 30) {
    return {
      badge: '주의',
      signal: 'WARNING',
      shouldAlert: true,
      headline: '전력 고갈 징후 포착! 반경 15m 내 콘센트를 수색하십시오.',
      message: '제1배터리탐색구조대 출동 대기 중. 불필요한 유튜브·인스타 배터리 생존 위협 요소를 종료하세요.',
    };
  }

  if (charge <= 60) {
    return {
      badge: '양호',
      signal: 'CAUTION',
      shouldAlert: false,
      headline: '아직 버틸 만하지만 방심은 금물입니다.',
      message: '외출 전 보조배터리 지참 여부를 재점검하시기 바랍니다.',
    };
  }

  return {
    badge: '평온',
    signal: 'NORMAL',
    shouldAlert: false,
    headline: '배터리 생태계가 매우 평화롭습니다.',
    message: '현재 전력 상태 이상 무. 당신의 배터리는 안전한 상태입니다.',
  };
}

// 0. 서버 켜졌는지 확인용 기본 주소
app.get('/', (req, res) => {
  res.send('Battery Rescue HQ 백엔드 서버가 정상 작동 중입니다!');
});

// 1. [핵심] 게이지 숫자(charge)를 받아서 판단 결과와 경고 시그널 전달 (브라우저 테스트용 GET)
// 예: http://localhost:3000/api/battery?charge=14
app.get('/api/battery', (req, res) => {
  const rawCharge = Number(req.query.charge ?? 12);
  const charge = Math.min(100, Math.max(1, Math.round(Number.isFinite(rawCharge) ? rawCharge : 12)));
  const result = evaluateBattery(charge, isCharging);

  res.json({
    charge,
    isCharging,
    alertCount,
    ...result,
  });
});

// 2. [핵심] 프론트엔드에서 슬라이더 드래그 시 숫자(charge)를 보내면 시그널 전달 (POST)
app.post('/api/battery', (req, res) => {
  const rawCharge = Number(req.body.charge ?? 12);
  const charge = Math.min(100, Math.max(1, Math.round(Number.isFinite(rawCharge) ? rawCharge : 12)));
  const result = evaluateBattery(charge, isCharging);

  res.json({
    charge,
    isCharging,
    alertCount,
    ...result,
  });
});

// 3. 기획서의 [긴급 알림 발송] 버튼 기능 (경고 메시지 발송 건수 +1 증가)
app.post('/api/alert', (req, res) => {
  const rawCharge = Number(req.body.charge ?? 12);
  const charge = Math.min(100, Math.max(1, Math.round(Number.isFinite(rawCharge) ? rawCharge : 12)));
  alertCount += 1;
  const result = evaluateBattery(charge, isCharging);

  res.json({
    ok: true,
    charge,
    alertCount,
    dispatchedAt: new Date().toISOString(),
    ...result,
  });
});

// 4. 기획서의 [충전기 연결] 버튼 기능 (연결 상태 켜기/끄기)
app.post('/api/charger', (req, res) => {
  isCharging = typeof req.body.isCharging === 'boolean' ? req.body.isCharging : !isCharging;
  const rawCharge = Number(req.body.charge ?? 12);
  const charge = Math.min(100, Math.max(1, Math.round(Number.isFinite(rawCharge) ? rawCharge : 12)));
  const result = evaluateBattery(charge, isCharging);

  res.json({
    ok: true,
    charge,
    isCharging,
    alertCount,
    ...result,
  });
});

app.listen(PORT, () => {
  console.log(`Battery Warning 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
