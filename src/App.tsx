import { useState, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";

// ==================== TYPES ====================
type Club = {
  id: string;
  name: string;
  color: string;
  monthly: number | null;
  daily: number | null;
};

type Staff = {
  id: string;
  name: string;
  shortcut: string;
  role: string;
  club: string | null;
  salary: number | null;
  dailySalary: number | null;
  managementBonus: number;
  emoji: string;
  inAttendance: boolean;
};

type LoadItem = {
  id: number;
  clubId: string;
  day: string;
  amount: string;
  note: string;
};

type BonusItem = {
  id: number;
  staffId: string;
  amount: string;
  type: string;
  note: string;
  date: string;
};

type SalafItem = {
  id: number;
  staffId: string;
  date: string;
  amount: string;
  note: string;
  returned: boolean;
};

type NewClubState = {
  name: string;
  daily: string | null;
  monthly: string;
  color: string;
  staffName: string;
};

type NewStaffState = {
  name: string;
  role: string;
  club: string;
  workLocation: string;
  salary: string;
  emoji: string;
  inAttendance: boolean;
};

type NewLoadState = {
  clubId: string;
  day: string;
  amount: string;
  note: string;
};

type NewBonusState = {
  staffId: string;
  amount: string;
  type: string;
  note: string;
  date: string;
};

type NewSalafState = {
  staffId: string;
  amount: string;
  note: string;
  date: string;
};

type EditStaffState = {
  id: string;
  salary: string;
  dailySalary: string;
  managementBonus: string;
  club: string;
  role: string;
  inAttendance: boolean;
} | null;

// ==================== CONSTANTS ====================
const CLUBS: Club[] = [
  { id: "xo",   name: "XO Cairo", color: "#FF6B35", monthly: 31000, daily: null },
  { id: "nox",  name: "Nox",      color: "#A855F7", monthly: null,  daily: 800  },
  { id: "sess", name: "Sess",     color: "#22D3EE", monthly: null,  daily: 600  },
  { id: "ok1",  name: "1ok Club", color: "#4ADE80", monthly: 28000, daily: null },
];

const INITIAL_STAFF: Staff[] = [
  { id:"framel", name:"Framel", shortcut:"F",  role:"مشغل + مدير", club:"nox", salary:null, dailySalary:500, managementBonus:4500, emoji:"👑", inAttendance:true },
  { id:"fifty",  name:"Fifty",  shortcut:"Fi", role:"مشغل",        club:"ok1", salary:8000,  dailySalary:null, managementBonus:0,    emoji:"🎛️", inAttendance:true },
  { id:"khaled", name:"Khaled", shortcut:"K",  role:"مشغل",        club:"xo",  salary:8000,  dailySalary:null, managementBonus:0,    emoji:"🎛️", inAttendance:true },
  { id:"ta7a",   name:"Ta7a",   shortcut:"T",  role:"مشغل",        club:"ok1", salary:10000, dailySalary:null, managementBonus:0,    emoji:"🎛️", inAttendance:true },
  { id:"badwy",  name:"Badwy",  shortcut:"-",  role:"علاقات عامة", club:null,  salary:5000,  dailySalary:null, managementBonus:0,    emoji:"🤝", inAttendance:false },
];

// ---- Shortcut helpers ----
function buildShortcut(name: string, existingShortcuts: string[]): string {
  const clean = name.replace(/[^a-zA-Z]/g, "");
  if (!clean) return name.slice(0,2).toUpperCase();
  const one = clean[0].toUpperCase();
  if (!existingShortcuts.includes(one)) return one;
  const two = clean.slice(0,2);
  const twoU = two[0].toUpperCase() + (two[1]||"").toLowerCase();
  if (!existingShortcuts.includes(twoU)) return twoU;
  return twoU + existingShortcuts.length;
}

function buildShortcutMap(staffList: Staff[]): Record<string,string> {
  const map: Record<string,string> = { off:"__OFF__", Off:"__OFF__", OFF:"__OFF__" };
  staffList.forEach(s => {
    if (!s.shortcut || s.shortcut === "-") return;
    [s.shortcut, s.shortcut.toLowerCase(), s.shortcut.toUpperCase()].forEach(v => { map[v] = s.id; });
    // handle "Fi" specifically: Fi -> fifty
    if (s.shortcut.length === 2) {
      const mixed = s.shortcut[0].toUpperCase() + s.shortcut[1].toLowerCase();
      map[mixed] = s.id;
    }
  });
  return map;
}

function parseShortcuts(input: string, staffList: Staff[]) {
  if (!input || !input.trim()) return { ids:[] as string[], isOff:false };
  const tokens = input.trim().split(/[\s,،]+/);
  const map = buildShortcutMap(staffList);
  const ids: string[] = [];
  let isOff = false;
  tokens.forEach((t: string) => {
    if (!t) return;
    const val = map[t] || map[t.toLowerCase()] || map[t.toUpperCase()];
    if (val === "__OFF__") isOff = true;
    else if (val) ids.push(val);
  });
  return { ids:[...new Set(ids)], isOff };
}

function getDaysInMonth(y: number, m: number): number { return new Date(y, m+1, 0).getDate(); }
function formatEGP(n: number): string { if (isNaN(n)) return "0 جنيه"; return Number(n).toLocaleString("ar-EG") + " جنيه"; }

// ==================== MAIN APP ====================
export default function App() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(() => { const s = localStorage.getItem("currentMonth"); return s !== null ? Number(s) : today.getMonth(); });
  const [currentYear,  setCurrentYear]  = useState<number>(() => { const s = localStorage.getItem("currentYear");  return s !== null ? Number(s) : today.getFullYear(); });
  const [activeTab,    setActiveTab]    = useState<string>("dashboard");
  const [staff,        setStaff]        = useState<Staff[]>(() => { const s = localStorage.getItem("staff"); return s ? JSON.parse(s) as Staff[] : INITIAL_STAFF; });

  const [clubs, setClubs] = useState<Club[]>(() => { const s = localStorage.getItem("clubs"); return s ? JSON.parse(s) as Club[] : CLUBS; });
  const [showAddClub, setShowAddClub] = useState(false);
  const [newClub, setNewClub] = useState<NewClubState>({ name:"", daily:null, monthly:"", color:"#A855F7", staffName:"" });

  const [attendance, setAttendance] = useState<Record<string, Record<number, string | null>>>(() => { const s = localStorage.getItem(`attendance_${currentYear}_${currentMonth}`); return s ? JSON.parse(s) as Record<string, Record<number, string | null>> : {}; });
  const [sessInput,  setSessInput]  = useState<Record<number, string>>(() => { const s = localStorage.getItem(`sessInput_${currentYear}_${currentMonth}`);  return s ? JSON.parse(s) as Record<number, string> : {}; });
  const [clubOff,    setClubOff]    = useState<Record<string, Record<number, boolean>>>(() => { const s = localStorage.getItem(`clubOff_${currentYear}_${currentMonth}`);    return s ? JSON.parse(s) as Record<string, Record<number, boolean>> : {}; });

  // Load: [{ id, clubId, day, amount, note }]
  const [loads, setLoads] = useState<LoadItem[]>(() => {
    const saved = localStorage.getItem(`loads_${currentYear}_${currentMonth}`);
    return saved ? JSON.parse(saved) as LoadItem[] : [];
  });
  const [newLoad, setNewLoad] = useState<NewLoadState>({ clubId:"xo", day:"", amount:"", note:"" });

  // Bonuses: [{ id, staffId, amount, type, note, date }]
  const [bonuses, setBonuses] = useState<BonusItem[]>(() => { const s = localStorage.getItem("bonuses"); return s ? JSON.parse(s) as BonusItem[] : []; });
  const [newBonus, setNewBonus] = useState<NewBonusState>({ staffId:"framel", amount:"", type:"حافز", note:"", date:"" });

  // Salaf: [{ id, staffId, date, amount, note, returned }]
  const [salaf, setSalaf] = useState<SalafItem[]>(() => { const s = localStorage.getItem("salaf"); return s ? JSON.parse(s) as SalafItem[] : []; });
  const [newSalaf, setNewSalaf] = useState<NewSalafState>({ staffId:"framel", amount:"", note:"", date:"" });

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState<NewStaffState>({ name:"", role:"", club:"nox", workLocation:"", salary:"0", emoji:"👤", inAttendance:true });
  const [editingStaff, setEditingStaff] = useState<EditStaffState>(null);

  // ==================== PERSIST TO LOCALSTORAGE ====================
  useEffect(() => { localStorage.setItem("currentMonth", String(currentMonth)); }, [currentMonth]);
  useEffect(() => { localStorage.setItem("currentYear",  String(currentYear));  }, [currentYear]);
  useEffect(() => { localStorage.setItem("staff",      JSON.stringify(staff));      }, [staff]);
  useEffect(() => { localStorage.setItem("clubs",      JSON.stringify(clubs));      }, [clubs]);
  useEffect(() => { localStorage.setItem(`attendance_${currentYear}_${currentMonth}`, JSON.stringify(attendance)); }, [attendance, currentYear, currentMonth]);
  useEffect(() => { localStorage.setItem(`sessInput_${currentYear}_${currentMonth}`,  JSON.stringify(sessInput));  }, [sessInput, currentYear, currentMonth]);
  useEffect(() => { localStorage.setItem(`clubOff_${currentYear}_${currentMonth}`,    JSON.stringify(clubOff));    }, [clubOff, currentYear, currentMonth]);
  useEffect(() => { localStorage.setItem(`loads_${currentYear}_${currentMonth}`,      JSON.stringify(loads));      }, [loads, currentYear, currentMonth]);
  useEffect(() => { localStorage.setItem("bonuses",    JSON.stringify(bonuses));    }, [bonuses]);
  useEffect(() => { localStorage.setItem("salaf",      JSON.stringify(salaf));      }, [salaf]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const monthName   = new Date(currentYear, currentMonth, 1).toLocaleDateString("ar-EG", { month:"long", year:"numeric" });

  // ==================== CALCULATIONS ====================
  const calc = useMemo(() => {
    const clubWorkDays: Record<string, number> = {}, clubRevenues: Record<string, number> = {}, clubDailyRate: Record<string, number> = {};
    clubs.forEach(c => {
      let days = 0;
      for (let d = 1; d <= daysInMonth; d++) if (!clubOff[c.id]?.[d]) days++;
      clubWorkDays[c.id] = days;
      // Daily clubs: exact daily rate. Monthly clubs: proportional, no intermediate rounding
      const rate = c.daily ? c.daily : ((c.monthly ?? 0) / daysInMonth);
      clubDailyRate[c.id] = c.daily ? c.daily : (c.monthly ?? 0);
      clubRevenues[c.id]  = c.daily ? Math.round(rate * days) : Math.round((c.monthly ?? 0) * days / daysInMonth);
    });
    const totalRevenue = Object.values(clubRevenues).reduce((a,b)=>a+b,0);

    const staffSalaries = staff.map(s => {
      if (!s.inAttendance) {
        const salafTotal = salaf.filter(sl=>sl.staffId===s.id&&!sl.returned).reduce((a,sl)=>a+Number(sl.amount),0);
        const bonusEarned1 = bonuses.filter(b=>b.staffId===s.id&&(!b.date||b.date.includes(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)||b.date.includes(`${String(currentMonth+1).padStart(2,'0')}/${currentYear}`))).reduce((a,b)=>a+Number(b.amount),0);
        const fixedSalary1 = s.dailySalary ? s.dailySalary * daysInMonth : (s.salary ?? 0);
        const netFixed = Math.max(0, fixedSalary1 + s.managementBonus + bonusEarned1 - salafTotal);
        return { ...s, offDays:0, deduction:0, sessCount:0, sessEarned:0, bonusEarned:bonusEarned1, total:netFixed, salafTotal };
      }
      let offDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const manualOff = attendance[s.id]?.[d] === "off";
        const clubOffDay = s.club && clubOff[s.club]?.[d];
        if (manualOff || clubOffDay) offDays++;
      }
      const effectiveSalary = s.dailySalary ? s.dailySalary * daysInMonth : (s.salary ?? 0);
      const dailyRate = s.dailySalary ? s.dailySalary : ((s.salary ?? 0) / daysInMonth);
      const deduction = Math.round(dailyRate * offDays);
      const earned    = effectiveSalary - deduction;

      let sessCount = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const { ids, isOff } = parseShortcuts(sessInput[d]||"", staff);
        if (!isOff && ids.includes(s.id)) sessCount++;
      }
      const sessEarned = sessCount * 250;
      const salafTotal = salaf.filter(sl=>sl.staffId===s.id&&!sl.returned).reduce((a,sl)=>a+Number(sl.amount),0);

      const bonusEarned = bonuses.filter(b=>b.staffId===s.id&&(!b.date||b.date.includes(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)||b.date.includes(`${String(currentMonth+1).padStart(2,'0')}/${currentYear}`))).reduce((a,b)=>a+Number(b.amount),0);
      const netAfterSalaf = Math.max(0, earned + s.managementBonus + sessEarned + bonusEarned - salafTotal);
      return { ...s, offDays, deduction, sessCount, sessEarned, bonusEarned, salafTotal, total: netAfterSalaf };
    });

    const sessTotalCost = staffSalaries.reduce((a,s)=>a+s.sessEarned,0);
    const totalSalaries = staffSalaries.reduce((a,s)=>a+s.total,0);

    // Load totals per club this month
    const loadByClub: Record<string, number> = {};
    clubs.forEach(c => { loadByClub[c.id] = loads.filter(l=>l.clubId===c.id).reduce((a,l)=>a+Number(l.amount),0); });
    const totalLoads = Object.values(loadByClub).reduce((a,b)=>a+b,0);

    // Salaf totals
    const totalSalaf = salaf.filter(s=>!s.returned).reduce((a,s)=>a+Number(s.amount),0);

    const monthBonuses = bonuses.filter(b=>!b.date||b.date.includes(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)||b.date.includes(`${String(currentMonth+1).padStart(2,'0')}/${currentYear}`));
    const totalBonuses = monthBonuses.reduce((a,b)=>a+Number(b.amount),0);
    const netProfit = totalRevenue - totalSalaries - totalLoads;

    // Period reports
    const periods = [
      { label:"فترة أولى",  from:1,  to:10,          payDay:3  },
      { label:"فترة ثانية", from:11, to:20,           payDay:13 },
      { label:"فترة ثالثة",from:21, to:daysInMonth,  payDay:23 },
    ];
    const periodReports = periods.map(p => {
      const pDays = p.to - p.from + 1;
      const periodRevenue: Record<string, number> = {};
      clubs.forEach(c => {
        let wDays = 0;
        for (let d = p.from; d <= p.to; d++) if (!clubOff[c.id]?.[d]) wDays++;
        periodRevenue[c.id] = c.daily ? Math.round(c.daily * wDays) : Math.round((c.monthly ?? 0) * wDays / daysInMonth);
      });
      const totalPR = Object.values(periodRevenue).reduce((a,b)=>a+b,0);
      const periodLoads = loads.filter(l=>Number(l.day)>=p.from&&Number(l.day)<=p.to).reduce((a,l)=>a+Number(l.amount),0);

      const periodSalaries = staff.map(s => {
        if (!s.inAttendance) {
          return { ...s, offDays:0, sessCount:0, sessEarned:0, earned: Math.round(((s.salary ?? 0)/daysInMonth)*pDays) };
        }
        let offDays = 0;
        for (let d = p.from; d <= p.to; d++) {
          const manualOff = attendance[s.id]?.[d] === "off";
          const clubOffDay = s.club && clubOff[s.club]?.[d];
          if (manualOff || clubOffDay) offDays++;
        }
        const dailyRate2 = s.dailySalary ? s.dailySalary : ((s.salary ?? 0) / daysInMonth);
        const salaryShare = Math.round(dailyRate2 * pDays) - Math.round(dailyRate2 * offDays);
        const mgmtShare = Math.round((s.managementBonus / daysInMonth) * pDays);
        let sessCount = 0;
        for (let d = p.from; d <= p.to; d++) {
          const { ids, isOff } = parseShortcuts(sessInput[d]||"", staff);
          if (!isOff && ids.includes(s.id)) sessCount++;
        }
        const sessEarned = sessCount * 250;
        return { ...s, offDays, sessCount, sessEarned, earned: salaryShare + mgmtShare + sessEarned };
      });
      const totalPS = periodSalaries.reduce((a,s)=>a+s.earned,0);
      return { ...p, periodRevenue, periodSalaries, totalPR, totalPS, periodLoads, netPeriod: totalPR - totalPS - periodLoads };
    });

    return { clubWorkDays, clubRevenues, clubDailyRate, totalRevenue, staffSalaries, totalSalaries, sessTotalCost, loadByClub, totalLoads, totalSalaf, totalBonuses, netProfit, periodReports };
  }, [attendance, clubOff, sessInput, staff, clubs, loads, salaf, bonuses, daysInMonth, currentMonth, currentYear]);

  // ==================== HANDLERS ====================
  const toggleAttendance = (sid: string, day: number) => {
    setAttendance(prev => {
      const cur = prev[sid]?.[day];
      const next = cur==="present"?"off":cur==="off"?null:"present";
      return { ...prev, [sid]: { ...(prev[sid]||{}), [day]: next } };
    });
  };
  const toggleClubOff = (cid: string, day: number) => setClubOff(prev => ({ ...prev, [cid]: { ...(prev[cid] || {}), [day]: !prev[cid]?.[day] } }));

  const addStaffMember = () => {
    if (!newStaff.name) return;
    const existingShortcuts = staff.map(s=>s.shortcut);
    const shortcut = buildShortcut(newStaff.name, existingShortcuts);
    const id = newStaff.name.toLowerCase().replace(/\s/g,"_") + Date.now();
    setStaff(prev=>[...prev,{ id, name:newStaff.name, shortcut, role:newStaff.role, club:newStaff.club||null, salary:parseInt(newStaff.salary)||0, dailySalary:null, managementBonus:0, emoji:newStaff.emoji||"👤", inAttendance:newStaff.inAttendance }]);
    setNewStaff({ name:"", role:"", club:"nox", workLocation:"", salary:"0", emoji:"👤", inAttendance:true });
    setShowAddStaff(false);
  };
  const removeStaff = (id: string) => setStaff(prev=>prev.filter(s=>s.id!==id));

  const addClub = () => {
    if (!newClub.name) return;
    const id = newClub.name.toLowerCase().replace(/\s/g,"_") + Date.now();
    const monthly = newClub.monthly ? Number(newClub.monthly) : null;
    const daily   = newClub.daily   ? Number(newClub.daily)   : null;
    setClubs(prev => [...prev, { id, name:newClub.name, color:newClub.color, monthly, daily }]);
    setNewClub({ name:"", daily:null, monthly:"", color:"#A855F7", staffName:"" });
    setShowAddClub(false);
  };
  const removeClub = (id: string) => {
    setClubs(prev => prev.filter(c => c.id !== id));
    setStaff(prev => prev.map(s => s.club === id ? { ...s, club: null } : s));
  };

  const saveStaffEdit = () => {
    if (!editingStaff) return;
    setStaff(prev => prev.map(s => s.id === editingStaff.id ? {
      ...s,
      salary: editingStaff.dailySalary ? null : (parseInt(editingStaff.salary) || 0),
      dailySalary: editingStaff.dailySalary ? (parseInt(editingStaff.dailySalary) || null) : null,
      managementBonus: parseInt(editingStaff.managementBonus) || 0,
      club: editingStaff.club || null,
      role: editingStaff.role || s.role,
      inAttendance: editingStaff.inAttendance,
    } : s));
    setEditingStaff(null);
  };

  const addLoad = () => {
    if (!newLoad.amount || !newLoad.day) return;
    setLoads(prev=>[...prev,{ id:Date.now(), ...newLoad }]);
    setNewLoad({ clubId:"xo", day:"", amount:"", note:"" });
  };
  const removeLoad = (id: number) => setLoads(prev=>prev.filter(l=>l.id!==id));

  const addSalaf = () => {
    if (!newSalaf.amount) return;
    setSalaf(prev=>[...prev,{ id:Date.now(), ...newSalaf, returned:false }]);
    setNewSalaf({ staffId:"framel", amount:"", note:"", date:"" });
  };
  const addBonus = () => { if (!newBonus.amount) return; setBonuses(prev=>[...prev,{ id:Date.now(), ...newBonus }]); setNewBonus({ staffId:"framel", amount:"", type:"حافز", note:"", date:"" }); };
  const removeBonus = (id: number) => setBonuses(prev=>prev.filter(b=>b.id!==id));

  const toggleSalafReturned = (id: number) => setSalaf(prev=>prev.map(s=>s.id===id?{...s,returned:!s.returned}:s));
  const removeSalaf = (id: number) => setSalaf(prev=>prev.filter(s=>s.id!==id));

  const switchMonth = (newMonth: number, newYear: number) => {
    // Load saved data for the target month
    const att = localStorage.getItem(`attendance_${newYear}_${newMonth}`);
    const sess = localStorage.getItem(`sessInput_${newYear}_${newMonth}`);
    const coff = localStorage.getItem(`clubOff_${newYear}_${newMonth}`);
    const lds = localStorage.getItem(`loads_${newYear}_${newMonth}`);
    setAttendance(att ? JSON.parse(att) : {});
    setSessInput(sess ? JSON.parse(sess) : {});
    setClubOff(coff ? JSON.parse(coff) : {});
    setLoads(lds ? JSON.parse(lds) : []);
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };
  const prevMonth = () => { if(currentMonth===0){ switchMonth(11, currentYear-1); }else{ switchMonth(currentMonth-1, currentYear); } };
  const nextMonth = () => { if(currentMonth===11){ switchMonth(0, currentYear+1); }else{ switchMonth(currentMonth+1, currentYear); } };

  const attendanceStaff = staff.filter(s=>s.inAttendance);

  const tabs = [
    { id:"dashboard", label:"الرئيسية", icon:"📊" },
    { id:"attendance",label:"الحضور",   icon:"📅" },
    { id:"sess",      label:"Sess",     icon:"🎙️" },
    { id:"report",    label:"تقرير",    icon:"💰" },
    { id:"load",      label:"Load",     icon:"💵" },
    { id:"salaf",     label:"سلف",      icon:"🤝" },
    { id:"bonuses",    label:"حوافز",     icon:"🏆" },
    { id:"clubs",     label:"كلوبات",   icon:"🎪" },
    { id:"operator",  label:"Operator", icon:"⚙️" },
  ];

  // ==================== ADD STAFF MODAL ====================
  // NOTE: rendered as inline JSX in return to avoid keyboard dismiss bug

  // ==================== RENDER ====================
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f 0%,#0f0a1a 50%,#0a0f0a 100%)",fontFamily:"'Cairo','Tajawal',sans-serif",color:"#e8e0ff",direction:"rtl" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#7c3aed;border-radius:2px;}
        .hov{transition:all .15s;cursor:pointer;}
        .hov:hover{transform:scale(1.07);}
        .tabBtn{transition:all .2s;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeIn .25s ease forwards;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      `}</style>

      {showAddStaff && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#12101e",border:"1px solid rgba(124,58,237,.5)",borderRadius:20,padding:24,width:"100%",maxWidth:360 }}>
            <div style={{ fontWeight:900,fontSize:16,color:"#c084fc",marginBottom:14 }}>➕ موظف جديد</div>
            <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
              <input placeholder="الاسم (بالإنجليزي)" value={newStaff.name} onChange={e=>setNewStaff(p=>({...p,name:e.target.value}))} style={inputStyle} />
              <div style={{ fontSize:11,color:"#7c3aed",padding:"4px 8px",background:"rgba(124,58,237,.1)",borderRadius:8 }}>
                الاختصار سيكون: <strong>{newStaff.name ? buildShortcut(newStaff.name, staff.map(s=>s.shortcut)) : "..."}</strong>
              </div>
              <input placeholder="الدور (مثال: مشغل، مدير)" value={newStaff.role} onChange={e=>setNewStaff(p=>({...p,role:e.target.value}))} style={inputStyle} />
              <input placeholder="هيشتغل فين؟ (مثال: Nox, XO)" value={newStaff.workLocation} onChange={e=>setNewStaff(p=>({...p,workLocation:e.target.value}))} style={inputStyle} />
              <input placeholder="الراتب الثابت" type="number" value={newStaff.salary} onChange={e=>setNewStaff(p=>({...p,salary:e.target.value}))} style={inputStyle} />
              <select value={newStaff.club} onChange={e=>setNewStaff(p=>({...p,club:e.target.value}))} style={inputStyle}>
                <option value="">بدون كلوب</option>
                {clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display:"flex",gap:6 }}>
                {["👤","🎛️","🤝","👑","🎵","⚡","🔧"].map(e=>(
                  <button key={e} onClick={()=>setNewStaff(p=>({...p,emoji:e}))} style={{ fontSize:20,background:newStaff.emoji===e?"rgba(124,58,237,.35)":"rgba(255,255,255,.05)",border:newStaff.emoji===e?"1px solid #7c3aed":"1px solid transparent",borderRadius:8,padding:"4px 7px",cursor:"pointer" }}>{e}</button>
                ))}
              </div>
              <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#9ca3af",cursor:"pointer" }}>
                <input type="checkbox" checked={newStaff.inAttendance} onChange={e=>setNewStaff(p=>({...p,inAttendance:e.target.checked}))} />
                بيسجل حضور وغياب
              </label>
            </div>
            <div style={{ display:"flex",gap:8,marginTop:14 }}>
              <button onClick={addStaffMember} style={{...actionBtn,background:"linear-gradient(135deg,#7c3aed,#a855f7)",flex:1}}>إضافة</button>
              <button onClick={()=>setShowAddStaff(false)} style={{...actionBtn,background:"rgba(255,255,255,.08)",flex:1}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:"linear-gradient(90deg,rgba(124,58,237,.3),rgba(16,16,30,.95))",borderBottom:"1px solid rgba(124,58,237,.4)",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(20px)" }}>
        <div>
          <div style={{ fontSize:20,fontWeight:900,color:"#c084fc" }}>🎪 Bosa Manager</div>
          <div style={{ fontSize:11,color:"#7c3aed",fontWeight:600 }}>نظام إدارة الكلوبات</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button onClick={prevMonth} style={arrowBtn}>‹</button>
          <div style={{ textAlign:"center",minWidth:90 }}>
            <div style={{ fontSize:13,fontWeight:700 }}>{monthName}</div>
            <div style={{ fontSize:10,color:"#6b7280" }}>{daysInMonth} يوم</div>
          </div>
          <button onClick={nextMonth} style={arrowBtn}>›</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex",gap:3,padding:"9px 12px",background:"rgba(10,10,20,.85)",borderBottom:"1px solid rgba(124,58,237,.2)",overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} className="tabBtn" onClick={()=>setActiveTab(t.id)} style={{ padding:"7px 11px",borderRadius:11,border:"none",cursor:"pointer",background:activeTab===t.id?"linear-gradient(135deg,#7c3aed,#a855f7)":"rgba(255,255,255,.05)",color:activeTab===t.id?"#fff":"#9ca3af",fontFamily:"Cairo",fontSize:12,fontWeight:700,whiteSpace:"nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px",maxWidth:820,margin:"0 auto" }}>

        {/* ===== DASHBOARD ===== */}
        {activeTab==="dashboard" && (
          <div className="fade">
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
              <StatCard label="إجمالي الإيرادات"  value={formatEGP(calc.totalRevenue)}                   icon="💵" color="#4ade80" sub="هذا الشهر" />
              <StatCard label="إجمالي المرتبات"   value={formatEGP(calc.totalSalaries)}                  icon="💸" color="#fb923c" sub={`${staff.length} موظفين`} />
              <StatCard label="ربح قبل Load"      value={formatEGP(calc.netProfit + calc.totalLoads)}    icon="📈" color="#a78bfa" sub="بعد المرتبات" />
              <StatCard label="صافي بعد Load"     value={formatEGP(calc.netProfit)}                      icon="🏆" color={calc.netProfit>=0?"#4ade80":"#f87171"} sub={calc.totalLoads>0?`بعد سحب ${formatEGP(calc.totalLoads)}`:"لا يوجد load"} />
            </div>

            <SectionTitle>إيرادات الكلوبات</SectionTitle>
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
              {clubs.map(c=>{
                const rev=calc.clubRevenues[c.id];
                const maxR=Math.max(...Object.values(calc.clubRevenues));
                return (
                  <div key={c.id} style={cardStyle}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ width:9,height:9,borderRadius:"50%",background:c.color }}/>
                        <span style={{ fontWeight:700 }}>{c.name}</span>
                        <span style={{ fontSize:11,color:"#6b7280" }}>({calc.clubWorkDays[c.id]} يوم)</span>
                        {calc.loadByClub[c.id]>0&&<span style={{ fontSize:11,color:"#f87171",background:"rgba(248,113,113,.1)",padding:"1px 6px",borderRadius:5 }}>load -{formatEGP(calc.loadByClub[c.id])}</span>}
                      </div>
                      <span style={{ color:c.color,fontWeight:900 }}>{formatEGP(rev)}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,.05)",borderRadius:4,height:5 }}>
                      <div style={{ width:maxR>0?`${(rev/maxR)*100}%`:"0%",height:5,borderRadius:4,background:c.color,transition:"width .5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
              <SectionTitle>ملخص مرتبات الشباب</SectionTitle>
              <button onClick={()=>setShowAddStaff(true)} style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)",border:"none",borderRadius:10,color:"#fff",padding:"6px 13px",fontSize:12,fontFamily:"Cairo",fontWeight:700,cursor:"pointer" }}>+ موظف</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {calc.staffSalaries.map(s=>{
                const club=clubs.find(c=>c.id===s.club);
                return (
                  <div key={s.id} style={{ ...cardStyle,display:"flex",alignItems:"center",gap:11 }}>
                    <div style={{ width:42,height:42,borderRadius:11,background:club?`${club.color}20`:"rgba(255,255,255,.06)",border:`2px solid ${club?club.color:"rgba(255,255,255,.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0 }}>{s.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",justifyContent:"space-between" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontWeight:800,fontSize:14 }}>{s.name}</span>
                          <span style={{ fontSize:11,color:"#7c3aed",background:"rgba(124,58,237,.12)",padding:"1px 6px",borderRadius:5 }}>{s.shortcut}</span>
                          {s.dailySalary&&<span style={{ fontSize:11,color:"#a78bfa",background:"rgba(167,139,250,.1)",padding:"1px 6px",borderRadius:5 }}>{s.dailySalary}/يوم</span>}
                        </div>
                        <span style={{ color:"#4ade80",fontWeight:900,fontSize:14 }}>{formatEGP(s.total)}</span>
                      </div>
                      <div style={{ display:"flex",gap:5,marginTop:4,flexWrap:"wrap" }}>
                        {s.inAttendance&&s.offDays>0&&<span style={{ fontSize:11,background:"rgba(248,113,113,.1)",color:"#f87171",padding:"1px 6px",borderRadius:5 }}>{s.offDays} off (-{formatEGP(s.deduction)})</span>}
                        {s.managementBonus>0&&<span style={{ fontSize:11,background:"rgba(192,132,252,.1)",color:"#c084fc",padding:"1px 6px",borderRadius:5 }}>+{formatEGP(s.managementBonus)} إدارة</span>}
                        {s.sessCount>0&&<span style={{ fontSize:11,background:"rgba(34,211,238,.1)",color:"#22d3ee",padding:"1px 6px",borderRadius:5 }}>{s.sessCount}× Sess +{formatEGP(s.sessEarned)}</span>}
                        {s.bonusEarned>0&&<span style={{ fontSize:11,background:"rgba(251,191,36,.1)",color:"#fbbf24",padding:"1px 6px",borderRadius:5 }}>🏆 {formatEGP(s.bonusEarned)}</span>}
                        {s.salafTotal>0&&<span style={{ fontSize:11,background:"rgba(251,146,60,.1)",color:"#fb923c",padding:"1px 6px",borderRadius:5 }}>📋 سلف مستحقة: {formatEGP(s.salafTotal)}</span>}
                      </div>
                    </div>
                    {!INITIAL_STAFF.find(i=>i.id===s.id)&&(
                      <button onClick={()=>removeStaff(s.id)} style={{ background:"rgba(248,113,113,.12)",border:"none",borderRadius:8,color:"#f87171",width:26,height:26,cursor:"pointer",fontSize:13,flexShrink:0 }}>✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ATTENDANCE ===== */}
        {activeTab==="attendance" && (
          <div className="fade">
            <SectionTitle>تسجيل الحضور - {monthName}</SectionTitle>
            <div style={{ fontSize:11,color:"#6b7280",marginBottom:10 }}>اضغط: فاضي → <span style={{ color:"#4ade80" }}>✓ حاضر</span> → <span style={{ color:"#f87171" }}>✗ غايب (خصم)</span> → فاضي | بدوي راتبه ثابت</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%",borderCollapse:"collapse",minWidth:500 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>الموظف</th>
                    {Array.from({length:daysInMonth},(_,i)=><th key={i+1} style={{...thStyle,width:28,minWidth:28,fontSize:10}}>{i+1}</th>)}
                    <th style={thStyle}>Off</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStaff.map(s=>{
                    const club=clubs.find(c=>c.id===s.club);
                    const sd=calc.staffSalaries.find(x=>x.id===s.id)||{offDays:0};
                    return (
                      <tr key={s.id}>
                        <td style={{ padding:"5px 7px",borderBottom:"1px solid rgba(255,255,255,.05)",whiteSpace:"nowrap" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                            <span>{s.emoji}</span>
                            <div>
                              <div style={{ fontWeight:700,fontSize:12 }}>{s.name}</div>
                              <div style={{ fontSize:10,display:"flex",gap:4 }}>
                                <span style={{ color:"#7c3aed" }}>{s.shortcut}</span>
                                {club&&<span style={{ color:club.color }}>{club.name}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        {Array.from({length:daysInMonth},(_,i)=>{
                          const day=i+1;
                          const status=attendance[s.id]?.[day];
                          const isClubOff=s.club&&clubOff[s.club]?.[day];
                          return (
                            <td key={day} style={{ padding:2,borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                              <div className="hov" onClick={()=>!isClubOff&&toggleAttendance(s.id,day)} style={{
                                width:24,height:24,borderRadius:5,
                                display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
                                background:isClubOff?"rgba(255,255,255,.02)":status==="present"?"rgba(74,222,128,.2)":status==="off"?"rgba(248,113,113,.2)":"rgba(255,255,255,.04)",
                                border:isClubOff?"1px dashed rgba(255,255,255,.07)":status==="present"?"1px solid rgba(74,222,128,.5)":status==="off"?"1px solid rgba(248,113,113,.5)":"1px solid rgba(255,255,255,.07)",
                                cursor:isClubOff?"not-allowed":"pointer",opacity:isClubOff?.3:1,
                              }}>{isClubOff?"–":status==="present"?"✓":status==="off"?"✗":""}</div>
                            </td>
                          );
                        })}
                        <td style={{ padding:"5px 7px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                          <span style={{ background:"rgba(248,113,113,.12)",color:"#f87171",padding:"2px 7px",borderRadius:7,fontSize:12,fontWeight:700 }}>{sd.offDays}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:14,...addRowStyle,border:"1px dashed rgba(124,58,237,.3)" }}>
              <span style={{ fontSize:13,color:"#9ca3af" }}>إضافة موظف جديد لقائمة الحضور</span>
              <button onClick={()=>setShowAddStaff(true)} style={{...actionBtn,background:"linear-gradient(135deg,#7c3aed,#a855f7)",padding:"7px 14px",fontSize:12}}>+ إضافة</button>
            </div>
          </div>
        )}

        {/* ===== SESS ===== */}
        {activeTab==="sess" && (
          <div className="fade">
            <SectionTitle>تسجيل حضور Sess</SectionTitle>

            {/* Shortcuts reference */}
            <div style={{ ...cardStyle,marginBottom:12,borderRight:"3px solid #22d3ee" }}>
              <div style={{ fontWeight:700,color:"#22d3ee",marginBottom:8,fontSize:13 }}>الاختصارات المتاحة</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>
                {staff.filter(s=>s.shortcut&&s.shortcut!=="-").map(s=>(
                  <div key={s.id} style={{ background:"rgba(34,211,238,.1)",border:"1px solid rgba(34,211,238,.25)",borderRadius:8,padding:"4px 10px",fontSize:13 }}>
                    <span style={{ color:"#22d3ee",fontWeight:900 }}>{s.shortcut}</span>
                    <span style={{ color:"#6b7280",marginRight:4 }}>= {s.name}</span>
                  </div>
                ))}
                <div style={{ background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",borderRadius:8,padding:"4px 10px",fontSize:13 }}>
                  <span style={{ color:"#f87171",fontWeight:900 }}>off</span>
                  <span style={{ color:"#6b7280",marginRight:4 }}>= الكلوب مغلق</span>
                </div>
              </div>
              <div style={{ fontSize:11,color:"#6b7280" }}>اكتب الاختصارات مفصولة بمسافة أو فاصلة. مثال: <span style={{ color:"#22d3ee" }}>T, Fi, K</span> | أو اكتب <span style={{ color:"#f87171" }}>off</span> للإغلاق</div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {Array.from({length:daysInMonth},(_,i)=>{
                const day=i+1;
                const val=sessInput[day]||"";
                const { ids, isOff } = parseShortcuts(val, staff);
                return (
                  <div key={day} style={{ ...cardStyle,display:"flex",alignItems:"center",gap:9,padding:"10px 12px",background:isOff?"rgba(248,113,113,.06)":"rgba(255,255,255,.04)",border:isOff?"1px solid rgba(248,113,113,.2)":"1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ width:30,height:30,borderRadius:9,background:isOff?"rgba(248,113,113,.15)":"rgba(34,211,238,.1)",border:`1px solid ${isOff?"rgba(248,113,113,.3)":"rgba(34,211,238,.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontWeight:900,fontSize:13,color:isOff?"#f87171":"#22d3ee" }}>{day}</span>
                    </div>
                    <input value={val} onChange={e=>setSessInput(p=>({...p,[day]:e.target.value}))} placeholder="T, Fi, K أو off" style={{ ...inputStyle,flex:1,padding:"6px 10px",fontSize:12 }} />
                    <div style={{ display:"flex",gap:4,flexWrap:"wrap",minWidth:70,justifyContent:"flex-end" }}>
                      {isOff
                        ? <span style={{ fontSize:12,background:"rgba(248,113,113,.15)",color:"#f87171",padding:"2px 8px",borderRadius:6,fontWeight:700 }}>🔴 مغلق</span>
                        : ids.length>0
                          ? <>
                              {ids.map(id=>{ const s=staff.find(x=>x.id===id); return s?<span key={id} style={{ fontSize:12,background:"rgba(34,211,238,.12)",color:"#22d3ee",padding:"2px 7px",borderRadius:6,fontWeight:700 }}>{s.shortcut}</span>:null; })}
                              <span style={{ fontSize:11,color:"#6b7280" }}>{ids.length*250} ج</span>
                            </>
                          : val&&<span style={{ fontSize:11,color:"#f87171" }}>؟</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ ...cardStyle,marginTop:14,borderTop:"3px solid #22d3ee" }}>
              <div style={{ fontWeight:900,color:"#22d3ee",marginBottom:10 }}>📊 ملخص Sess الشهر</div>
              {staff.filter(s=>s.inAttendance).map(s=>{
                const sd=calc.staffSalaries.find(x=>x.id===s.id)||{sessCount:0,sessEarned:0};
                return sd.sessCount>0?(
                  <div key={s.id} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize:13 }}>{s.emoji} {s.name} <span style={{ color:"#6b7280",fontSize:11 }}>({sd.sessCount} يوم)</span></span>
                    <span style={{ color:"#22d3ee",fontWeight:700 }}>{formatEGP(sd.sessEarned)}</span>
                  </div>
                ):null;
              })}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",fontWeight:900 }}>
                <span style={{ color:"#22d3ee" }}>الإجمالي</span>
                <span style={{ color:"#22d3ee" }}>{formatEGP(calc.sessTotalCost)}</span>
              </div>
            </div>

            <div style={{ marginTop:12,...addRowStyle,border:"1px dashed rgba(34,211,238,.25)" }}>
              <span style={{ fontSize:13,color:"#9ca3af" }}>إضافة موظف جديد يروح Sess</span>
              <button onClick={()=>setShowAddStaff(true)} style={{...actionBtn,background:"linear-gradient(135deg,#0e7490,#22d3ee)",padding:"7px 14px",fontSize:12}}>+ إضافة</button>
            </div>
          </div>
        )}

        {/* ===== REPORT ===== */}
        {activeTab==="report" && (
          <div className="fade">
            <SectionTitle>📋 تقرير الشهر — {monthName}</SectionTitle>

            {/* Revenues */}
            <div style={{ ...cardStyle,marginBottom:12,borderTop:"3px solid #4ade80" }}>
              <div style={{ fontWeight:800,color:"#4ade80",marginBottom:10,fontSize:14 }}>💵 إيرادات الكلوبات</div>
              {clubs.map(c=>(
                <div key={c.id} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ width:8,height:8,borderRadius:"50%",background:c.color,display:"inline-block" }}/>
                    {c.name}
                    <span style={{ fontSize:11,color:"#6b7280" }}>({calc.clubWorkDays[c.id]} يوم)</span>
                  </span>
                  <span style={{ color:c.color,fontWeight:800,fontSize:13 }}>{formatEGP(calc.clubRevenues[c.id])}</span>
                </div>
              ))}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:900,fontSize:15 }}>
                <span style={{ color:"#4ade80" }}>الإجمالي</span>
                <span style={{ color:"#4ade80" }}>{formatEGP(calc.totalRevenue)}</span>
              </div>
            </div>

            {/* Salaries */}
            <div style={{ ...cardStyle,marginBottom:12,borderTop:"3px solid #f87171" }}>
              <div style={{ fontWeight:800,color:"#f87171",marginBottom:10,fontSize:14 }}>💸 مرتبات الشباب</div>
              {calc.staffSalaries.map(s=>(
                <div key={s.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                  <div>
                    <div style={{ fontSize:13,display:"flex",alignItems:"center",gap:5 }}>
                      <span>{s.emoji}</span>
                      <span style={{ fontWeight:700 }}>{s.name}</span>
                    </div>
                    <div style={{ display:"flex",gap:5,marginTop:3,flexWrap:"wrap" }}>
                      {s.inAttendance&&s.offDays>0&&<span style={{ fontSize:10,color:"#f87171" }}>-{s.offDays} يوم off</span>}
                      {s.sessCount>0&&<span style={{ fontSize:10,color:"#22d3ee" }}>+{s.sessCount} Sess</span>}
                      {s.managementBonus>0&&<span style={{ fontSize:10,color:"#c084fc" }}>+إدارة</span>}
                      {s.bonusEarned>0&&<span style={{ fontSize:10,color:"#fbbf24" }}>+حوافز {formatEGP(s.bonusEarned)}</span>}
                      {s.salafTotal>0&&<span style={{ fontSize:10,color:"#fb923c" }}>📋 سلف: {formatEGP(s.salafTotal)}</span>}
                    </div>
                  </div>
                  <span style={{ color:"#fb923c",fontWeight:900,fontSize:14 }}>{formatEGP(s.total)}</span>
                </div>
              ))}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:900,fontSize:15 }}>
                <span style={{ color:"#f87171" }}>الإجمالي</span>
                <span style={{ color:"#f87171" }}>{formatEGP(calc.totalSalaries)}</span>
              </div>
            </div>

            {/* Load */}
            {calc.totalLoads>0&&(
              <div style={{ ...cardStyle,marginBottom:12,borderTop:"3px solid #fb923c" }}>
                <div style={{ fontWeight:800,color:"#fb923c",marginBottom:8,fontSize:14 }}>💵 Load مسحوب (دخل حسابك)</div>
                {clubs.map(c=>calc.loadByClub[c.id]>0?(
                  <div key={c.id} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize:13,color:"#9ca3af" }}>{c.name}</span>
                    <span style={{ color:"#fb923c",fontWeight:700 }}>{formatEGP(calc.loadByClub[c.id])}</span>
                  </div>
                ):null)}
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:900 }}>
                  <span style={{ color:"#fb923c" }}>الإجمالي</span>
                  <span style={{ color:"#fb923c" }}>{formatEGP(calc.totalLoads)}</span>
                </div>
              </div>
            )}

            {/* Final summary */}
            <div style={{ ...cardStyle,border:"2px solid rgba(74,222,128,.4)",background:"rgba(74,222,128,.03)" }}>
              <div style={{ fontWeight:900,fontSize:15,color:"#4ade80",marginBottom:12 }}>📊 ملخص نهائي</div>
              <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                <Row label="إجمالي الإيرادات"  value={formatEGP(calc.totalRevenue)}                         color="#4ade80" />
                <Row label="إجمالي المرتبات"   value={"- " + formatEGP(calc.totalSalaries)}                 color="#f87171" />
                <div style={{ height:1,background:"rgba(255,255,255,.08)" }}/>
                <Row label="📈 قبل Load"        value={formatEGP(calc.netProfit + calc.totalLoads)}          color="#a78bfa" bold />
                {calc.totalLoads>0&&<Row label="Load مسحوب (حسابك)" value={"- " + formatEGP(calc.totalLoads)} color="#fb923c" />}
                <div style={{ height:1,background:"rgba(255,255,255,.12)" }}/>
                <Row label="🏆 الصافي النهائي" value={formatEGP(calc.netProfit)}                             color={calc.netProfit>=0?"#4ade80":"#f87171"} bold />
              </div>
            </div>
          </div>
        )}

        {/* ===== LOAD ===== */}
        {activeTab==="load" && (
          <div className="fade">
            <SectionTitle>💵 Load — فلوس سحبتها دخلت حسابك</SectionTitle>

            {/* Add load form */}
            <div style={{ ...cardStyle,marginBottom:14,border:"1px solid rgba(251,146,60,.3)" }}>
              <div style={{ fontWeight:700,color:"#fb923c",marginBottom:10 }}>إضافة سحب جديد</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8 }}>
                <select value={newLoad.clubId} onChange={e=>setNewLoad(p=>({...p,clubId:e.target.value}))} style={inputStyle}>
                  {clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="اليوم (1-31)" min="1" max="31" value={newLoad.day} onChange={e=>setNewLoad(p=>({...p,day:e.target.value}))} style={inputStyle} />
                <input type="number" placeholder="المبلغ (جنيه)" value={newLoad.amount} onChange={e=>setNewLoad(p=>({...p,amount:e.target.value}))} style={inputStyle} />
                <input placeholder="ملاحظة (اختياري)" value={newLoad.note} onChange={e=>setNewLoad(p=>({...p,note:e.target.value}))} style={inputStyle} />
              </div>
              <button onClick={addLoad} style={{...actionBtn,background:"linear-gradient(135deg,#b45309,#fb923c)",width:"100%"}}>+ إضافة سحب</button>
            </div>

            {/* Load list */}
            {loads.length===0
              ? <div style={{ textAlign:"center",padding:30,color:"#4b5563",fontSize:14 }}>لا يوجد سحوبات مسجلة</div>
              : (
                <>
                  {clubs.map(club=>{
                    const clubLoads=loads.filter(l=>l.clubId===club.id);
                    if (clubLoads.length===0) return null;
                    const total=clubLoads.reduce((a,l)=>a+Number(l.amount),0);
                    return (
                      <div key={club.id} style={{ ...cardStyle,marginBottom:12,borderTop:`3px solid ${club.color}` }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                          <span style={{ fontWeight:900,color:club.color }}>{club.name}</span>
                          <span style={{ color:"#fb923c",fontWeight:900 }}>{formatEGP(total)}</span>
                        </div>
                        {clubLoads.map(l=>(
                          <div key={l.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                              <span style={{ fontSize:11,background:"rgba(255,255,255,.07)",padding:"2px 7px",borderRadius:6,color:"#9ca3af" }}>يوم {l.day}</span>
                              <span style={{ fontSize:13,fontWeight:700,color:"#fb923c" }}>{formatEGP(Number(l.amount))}</span>
                              {l.note&&<span style={{ fontSize:11,color:"#6b7280" }}>{l.note}</span>}
                            </div>
                            <button onClick={()=>removeLoad(l.id)} style={{ background:"rgba(248,113,113,.12)",border:"none",borderRadius:7,color:"#f87171",width:24,height:24,cursor:"pointer",fontSize:12 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div style={{ ...cardStyle,border:"1px solid rgba(251,146,60,.4)" }}>
                    <Row label="إجمالي Load هذا الشهر" value={formatEGP(calc.totalLoads)} color="#fb923c" bold />
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ===== SALAF ===== */}
        {activeTab==="salaf" && (
          <div className="fade">
            <SectionTitle>🤝 السلف</SectionTitle>

            {/* Add salaf form */}
            <div style={{ ...cardStyle,marginBottom:14,border:"1px solid rgba(251,146,60,.3)" }}>
              <div style={{ fontWeight:700,color:"#fb923c",marginBottom:10 }}>إضافة سلفة جديدة</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8 }}>
                <select value={newSalaf.staffId} onChange={e=>setNewSalaf(p=>({...p,staffId:e.target.value}))} style={inputStyle}>
                  {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="number" placeholder="المبلغ (جنيه)" value={newSalaf.amount} onChange={e=>setNewSalaf(p=>({...p,amount:e.target.value}))} style={inputStyle} />
                <input placeholder="التاريخ" value={newSalaf.date} onChange={e=>setNewSalaf(p=>({...p,date:e.target.value}))} style={inputStyle} />
                <input placeholder="ملاحظة (اختياري)" value={newSalaf.note} onChange={e=>setNewSalaf(p=>({...p,note:e.target.value}))} style={inputStyle} />
              </div>
              <button onClick={addSalaf} style={{...actionBtn,background:"linear-gradient(135deg,#b45309,#fb923c)",width:"100%"}}>+ إضافة سلفة</button>
            </div>

            {/* Salaf by person */}
            {staff.filter(s=>salaf.some(sl=>sl.staffId===s.id)).map(s=>{
              const sSalaf=salaf.filter(sl=>sl.staffId===s.id);
              const pending=sSalaf.filter(sl=>!sl.returned).reduce((a,sl)=>a+Number(sl.amount),0);
              return (
                <div key={s.id} style={{ ...cardStyle,marginBottom:12,borderRight:"3px solid #fb923c" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                    <span style={{ fontWeight:900,fontSize:14 }}>{s.emoji} {s.name}</span>
                    <span style={{ color:"#fb923c",fontWeight:900 }}>متبقي: {formatEGP(pending)}</span>
                  </div>
                  {sSalaf.map(sl=>(
                    <div key={sl.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)",opacity:sl.returned?.5:1 }}>
                      <div style={{ display:"flex",gap:7,alignItems:"center",flex:1 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:sl.returned?"#6b7280":"#fb923c",textDecoration:sl.returned?"line-through":"none" }}>{formatEGP(Number(sl.amount))}</span>
                        {sl.date&&<span style={{ fontSize:11,color:"#6b7280" }}>{sl.date}</span>}
                        {sl.note&&<span style={{ fontSize:11,color:"#6b7280" }}>{sl.note}</span>}
                        {sl.returned&&<span style={{ fontSize:11,color:"#4ade80",background:"rgba(74,222,128,.1)",padding:"1px 6px",borderRadius:5 }}>✓ رُدّت</span>}
                      </div>
                      <div style={{ display:"flex",gap:5 }}>
                        <button onClick={()=>toggleSalafReturned(sl.id)} style={{ background:sl.returned?"rgba(74,222,128,.15)":"rgba(251,146,60,.15)",border:"none",borderRadius:7,color:sl.returned?"#4ade80":"#fb923c",padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"Cairo",fontWeight:700 }}>{sl.returned?"↩":"✓"}</button>
                        <button onClick={()=>removeSalaf(sl.id)} style={{ background:"rgba(248,113,113,.12)",border:"none",borderRadius:7,color:"#f87171",width:24,height:24,cursor:"pointer",fontSize:12 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {salaf.length===0&&<div style={{ textAlign:"center",padding:30,color:"#4b5563",fontSize:14 }}>لا يوجد سلف مسجلة</div>}

            {salaf.length>0&&(
              <div style={{ ...cardStyle,border:"1px solid rgba(251,146,60,.35)",marginTop:4 }}>
                <Row label="إجمالي السلف المتبقية" value={formatEGP(calc.totalSalaf)} color="#fb923c" bold />
              </div>
            )}
          </div>
        )}


        {/* ===== BONUSES ===== */}
        {activeTab==="bonuses" && (
          <div className="fade">
            <SectionTitle>🏆 الحوافز والبدلات</SectionTitle>

            {/* Add bonus form */}
            <div style={{ ...cardStyle,marginBottom:14,border:"1px solid rgba(251,191,36,.3)" }}>
              <div style={{ fontWeight:700,color:"#fbbf24",marginBottom:10 }}>إضافة حافز أو بدل</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8 }}>
                <select value={newBonus.staffId} onChange={e=>setNewBonus(p=>({...p,staffId:e.target.value}))} style={inputStyle}>
                  {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={newBonus.type} onChange={e=>setNewBonus(p=>({...p,type:e.target.value}))} style={inputStyle}>
                  <option value="حافز">🏆 حافز</option>
                  <option value="بدل">💼 بدل</option>
                  <option value="مكافأة">🎁 مكافأة</option>
                  <option value="عمولة">💹 عمولة</option>
                </select>
                <input type="number" placeholder="المبلغ (جنيه)" value={newBonus.amount} onChange={e=>setNewBonus(p=>({...p,amount:e.target.value}))} style={inputStyle} />
                <div style={{ display:"flex",flexDirection:"column",gap:4,gridColumn:"span 1" }}>
                  <input placeholder="التاريخ: 2025-05 أو 05/2025" value={newBonus.date} onChange={e=>setNewBonus(p=>({...p,date:e.target.value}))} style={inputStyle} />
                  <div style={{ fontSize:10,color:"#6b7280",paddingRight:4 }}>مثال: <span style={{color:"#fbbf24"}}>2025-05</span> أو <span style={{color:"#fbbf24"}}>05/2025</span> — لو فضيت فاضي هيظهر في كل الشهور</div>
                </div>
                <input placeholder="ملاحظة (مثال: أداء ممتاز)" value={newBonus.note} onChange={e=>setNewBonus(p=>({...p,note:e.target.value}))} style={{ ...inputStyle,gridColumn:"1 / -1" }} />
              </div>
              <button onClick={addBonus} style={{...actionBtn,background:"linear-gradient(135deg,#92400e,#fbbf24)",width:"100%"}}>+ إضافة</button>
            </div>

            {/* Bonuses by person */}
            {bonuses.length===0
              ? <div style={{ textAlign:"center",padding:30,color:"#4b5563",fontSize:14 }}>لا يوجد حوافز مسجلة</div>
              : (
                <>
                  {staff.filter(s=>bonuses.some(b=>b.staffId===s.id&&(!b.date||b.date.includes(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)||b.date.includes(`${String(currentMonth+1).padStart(2,'0')}/${currentYear}`)))).map(s=>{
                    const sBonuses=bonuses.filter(b=>b.staffId===s.id&&(!b.date||b.date.includes(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)||b.date.includes(`${String(currentMonth+1).padStart(2,'0')}/${currentYear}`)));
                    const total=sBonuses.reduce((a,b)=>a+Number(b.amount),0);
                    return (
                      <div key={s.id} style={{ ...cardStyle,marginBottom:12,borderRight:"3px solid #fbbf24" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                          <span style={{ fontWeight:900,fontSize:14 }}>{s.emoji} {s.name}</span>
                          <span style={{ color:"#fbbf24",fontWeight:900 }}>{formatEGP(total)}</span>
                        </div>
                        {sBonuses.map(b=>(
                          <div key={b.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                            <div style={{ display:"flex",gap:7,alignItems:"center",flex:1 }}>
                              <span style={{ fontSize:11,background:"rgba(251,191,36,.15)",color:"#fbbf24",padding:"2px 7px",borderRadius:6,fontWeight:700 }}>{b.type}</span>
                              <span style={{ fontSize:13,fontWeight:700,color:"#fbbf24" }}>{formatEGP(Number(b.amount))}</span>
                              {b.date&&<span style={{ fontSize:11,color:"#6b7280" }}>{b.date}</span>}
                              {b.note&&<span style={{ fontSize:11,color:"#9ca3af" }}>{b.note}</span>}
                            </div>
                            <button onClick={()=>removeBonus(b.id)} style={{ background:"rgba(248,113,113,.12)",border:"none",borderRadius:7,color:"#f87171",width:24,height:24,cursor:"pointer",fontSize:12 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  <div style={{ ...cardStyle,border:"1px solid rgba(251,191,36,.35)" }}>
                    <Row label="إجمالي الحوافز والبدلات" value={formatEGP(calc.totalBonuses)} color="#fbbf24" bold />
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ===== CLUBS ===== */}
        {activeTab==="clubs" && (
          <div className="fade">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <SectionTitle>إدارة الكلوبات</SectionTitle>
              <button onClick={()=>setShowAddClub(v=>!v)} style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)",border:"none",borderRadius:10,color:"#fff",padding:"6px 13px",fontSize:12,fontFamily:"Cairo",fontWeight:700,cursor:"pointer" }}>+ كلوب</button>
            </div>

            {showAddClub&&(
              <div style={{ ...cardStyle,marginBottom:14,border:"1px solid rgba(124,58,237,.4)" }}>
                <div style={{ fontWeight:700,color:"#c084fc",marginBottom:10 }}>إضافة كلوب جديد</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8 }}>
                  <input placeholder="اسم الكلوب" value={newClub.name} onChange={e=>setNewClub(p=>({...p,name:e.target.value}))} style={inputStyle} />
                  <input placeholder="اللون (#hex)" value={newClub.color} onChange={e=>setNewClub(p=>({...p,color:e.target.value}))} style={{...inputStyle,color:newClub.color}} />
                  <input type="number" placeholder="سعر اليوم (لو يومي)" value={newClub.daily||""} onChange={e=>setNewClub(p=>({...p,daily:e.target.value||null,monthly:""}))} style={inputStyle} />
                  <input type="number" placeholder="الشهري الثابت" value={newClub.monthly||""} onChange={e=>setNewClub(p=>({...p,monthly:e.target.value||"",daily:null}))} style={inputStyle} />
                  <input placeholder="اسم المسؤول (مثال: Framel)" value={newClub.staffName} onChange={e=>setNewClub(p=>({...p,staffName:e.target.value}))} style={{...inputStyle,gridColumn:"1 / -1"}} />
                </div>
                <div style={{ fontSize:11,color:"#6b7280",marginBottom:8 }}>اكتب إما سعر اليوم أو الشهري الثابت</div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={addClub} style={{...actionBtn,background:"linear-gradient(135deg,#7c3aed,#a855f7)",flex:1}}>إضافة</button>
                  <button onClick={()=>setShowAddClub(false)} style={{...actionBtn,background:"rgba(255,255,255,.08)",flex:1}}>إلغاء</button>
                </div>
              </div>
            )}

            <div style={{ fontSize:12,color:"#6b7280",marginBottom:12 }}>اضغط على اليوم عشان تحدده Off</div>
            {clubs.map(club=>{
              const offDays=Object.values(clubOff[club.id]||{}).filter(Boolean).length;
              const workDays=daysInMonth-offDays;
              const rev = club.daily ? Math.round(club.daily*workDays) : Math.round((club.monthly ?? 0)*workDays/daysInMonth);
              return (
                <div key={club.id} style={{ ...cardStyle,marginBottom:12,borderTop:`3px solid ${club.color}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:900,fontSize:15,color:club.color }}>{club.name}</div>
                      <div style={{ fontSize:12,color:"#6b7280" }}>{workDays} يوم شغل | {offDays} يوم off</div>
                    </div>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:10,color:"#6b7280" }}>الإيراد</div>
                      <div style={{ color:club.color,fontWeight:900 }}>{formatEGP(rev)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {Array.from({length:daysInMonth},(_,i)=>{
                      const day=i+1;
                      const isOff=clubOff[club.id]?.[day];
                      return (
                        <div key={day} className="hov" onClick={()=>toggleClubOff(club.id,day)} style={{ width:30,height:30,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:isOff?"rgba(248,113,113,.2)":`${club.color}12`,border:isOff?"1px solid rgba(248,113,113,.6)":`1px solid ${club.color}30`,color:isOff?"#f87171":club.color }}>{day}</div>
                      );
                    })}
                  </div>
                  {offDays>0&&<div style={{ marginTop:8,padding:"5px 10px",background:"rgba(248,113,113,.07)",borderRadius:8,fontSize:12,color:"#f87171" }}>⚠️ خسارة: {formatEGP(club.daily ? Math.round(club.daily*offDays) : Math.round((club.monthly ?? 0)*offDays/daysInMonth))}</div>}
                  {/* Delete button for ALL clubs */}
                  <button onClick={()=>removeClub(club.id)} style={{ marginTop:8,background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:8,color:"#f87171",padding:"4px 12px",cursor:"pointer",fontSize:12,fontFamily:"Cairo",fontWeight:700,width:"100%" }}>🗑️ حذف الكلوب</button>
                </div>
              );
            })}
          </div>
        )}
        {/* ===== OPERATOR ===== */}
        {activeTab==="operator" && (
          <div className="fade">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <SectionTitle>⚙️ إدارة الموظفين — Operator</SectionTitle>
              <button onClick={()=>setShowAddStaff(true)} style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)",border:"none",borderRadius:10,color:"#fff",padding:"6px 13px",fontSize:12,fontFamily:"Cairo",fontWeight:700,cursor:"pointer" }}>+ موظف</button>
            </div>

            {/* Edit modal */}
            {editingStaff && (
              <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
                <div style={{ background:"#12101e",border:"1px solid rgba(124,58,237,.5)",borderRadius:20,padding:24,width:"100%",maxWidth:380 }}>
                  <div style={{ fontWeight:900,fontSize:16,color:"#c084fc",marginBottom:16 }}>
                    ✏️ تعديل بيانات {staff.find(s=>s.id===editingStaff.id)?.name}
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    <div>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>الدور / المسمى الوظيفي</div>
                      <input value={editingStaff.role} onChange={e=>setEditingStaff(p=>p?{...p,role:e.target.value}:p)} placeholder="مثال: مشغل، مدير" style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>الكلوب</div>
                      <select value={editingStaff.club} onChange={e=>setEditingStaff(p=>p?{...p,club:e.target.value}:p)} style={inputStyle}>
                        <option value="">بدون كلوب (Unemployed)</option>
                        {clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      <div>
                        <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>الراتب الثابت (شهري)</div>
                        <input type="number" value={editingStaff.salary} onChange={e=>setEditingStaff(p=>p?{...p,salary:e.target.value,dailySalary:""}:p)} placeholder="0" style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>راتب يومي</div>
                        <input type="number" value={editingStaff.dailySalary} onChange={e=>setEditingStaff(p=>p?{...p,dailySalary:e.target.value,salary:""}:p)} placeholder="0" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ fontSize:11,color:"#6b7280",padding:"4px 8px",background:"rgba(124,58,237,.08)",borderRadius:7 }}>
                      ⚠️ لو حطيت راتب يومي، الشهري بيتجاهل — وبالعكس
                    </div>
                    <div>
                      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>بونص الإدارة (شهري)</div>
                      <input type="number" value={editingStaff.managementBonus} onChange={e=>setEditingStaff(p=>p?{...p,managementBonus:e.target.value}:p)} placeholder="0" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,marginTop:16 }}>
                    <button onClick={saveStaffEdit} style={{...actionBtn,background:"linear-gradient(135deg,#7c3aed,#a855f7)",flex:1}}>💾 حفظ</button>
                    <button onClick={()=>setEditingStaff(null)} style={{...actionBtn,background:"rgba(255,255,255,.08)",flex:1}}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {staff.map(s=>{
                const club = clubs.find(c=>c.id===s.club);
                const isUnemployed = !s.club;
                return (
                  <div key={s.id} style={{ ...cardStyle,borderRight:`3px solid ${isUnemployed?"#6b7280":club?.color||"#7c3aed"}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:11 }}>
                      {/* Avatar */}
                      <div style={{ width:44,height:44,borderRadius:12,background:isUnemployed?"rgba(107,114,128,.15)":`${club?.color||"#7c3aed"}20`,border:`2px solid ${isUnemployed?"rgba(107,114,128,.4)":club?.color||"#7c3aed"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{s.emoji}</div>

                      {/* Info */}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                          <span style={{ fontWeight:900,fontSize:14 }}>{s.name}</span>
                          <span style={{ fontSize:11,color:"#7c3aed",background:"rgba(124,58,237,.12)",padding:"1px 6px",borderRadius:5 }}>{s.shortcut}</span>
                          {isUnemployed
                            ? <span style={{ fontSize:11,color:"#9ca3af",background:"rgba(107,114,128,.15)",padding:"1px 8px",borderRadius:5,border:"1px solid rgba(107,114,128,.3)" }}>Unemployed</span>
                            : <span style={{ fontSize:11,color:club?.color,background:`${club?.color}18`,padding:"1px 8px",borderRadius:5 }}>{club?.name}</span>
                          }
                        </div>
                        <div style={{ fontSize:11,color:"#9ca3af",marginTop:2 }}>{s.role}</div>
                        <div style={{ display:"flex",gap:6,marginTop:4,flexWrap:"wrap" }}>
                          {s.dailySalary
                            ? <span style={{ fontSize:11,color:"#a78bfa",background:"rgba(167,139,250,.1)",padding:"2px 7px",borderRadius:5 }}>{s.dailySalary.toLocaleString()} جنيه/يوم</span>
                            : <span style={{ fontSize:11,color:"#4ade80",background:"rgba(74,222,128,.08)",padding:"2px 7px",borderRadius:5 }}>{(s.salary??0).toLocaleString()} جنيه/شهر</span>
                          }
                          {s.managementBonus>0&&<span style={{ fontSize:11,color:"#c084fc",background:"rgba(192,132,252,.1)",padding:"2px 7px",borderRadius:5 }}>+{s.managementBonus.toLocaleString()} إدارة</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex",flexDirection:"column",gap:5,flexShrink:0 }}>
                        <button onClick={()=>setEditingStaff({
                          id: s.id,
                          salary: s.salary ? String(s.salary) : "",
                          dailySalary: s.dailySalary ? String(s.dailySalary) : "",
                          managementBonus: String(s.managementBonus),
                          club: s.club || "",
                          role: s.role,
                        })} style={{ background:"rgba(124,58,237,.2)",border:"1px solid rgba(124,58,237,.4)",borderRadius:8,color:"#c084fc",padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"Cairo",fontWeight:700 }}>✏️ تعديل</button>
                        <button onClick={()=>removeStaff(s.id)} style={{ background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",borderRadius:8,color:"#f87171",padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:"Cairo",fontWeight:700 }}>🗑️ حذف</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unemployed summary */}
            {staff.filter(s=>!s.club).length > 0 && (
              <div style={{ ...cardStyle,marginTop:14,border:"1px solid rgba(107,114,128,.3)",background:"rgba(107,114,128,.05)" }}>
                <div style={{ fontWeight:700,color:"#9ca3af",marginBottom:8,fontSize:13 }}>👤 موظفين بدون كلوب (Unemployed)</div>
                {staff.filter(s=>!s.club).map(s=>(
                  <div key={s.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ fontSize:13 }}>{s.emoji} {s.name}</span>
                    <span style={{ fontSize:11,color:"#6b7280",background:"rgba(107,114,128,.12)",padding:"2px 8px",borderRadius:5 }}>Unemployed</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ==================== HELPERS ====================
function StatCard({label,value,icon,color,sub}: {label: string; value: string; icon: string; color: string; sub: string}){
  return <div style={{...cardStyle,textAlign:"center",borderTop:`3px solid ${color}`}}><div style={{fontSize:22,marginBottom:4}}>{icon}</div><div style={{fontSize:15,fontWeight:900,color}}>{value}</div><div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{label}</div><div style={{fontSize:10,color:"#6b7280"}}>{sub}</div></div>;
}
function SectionTitle({children}: {children: ReactNode}){
  return <div style={{fontWeight:900,fontSize:14,color:"#c084fc",marginBottom:9,display:"flex",alignItems:"center",gap:7}}><div style={{width:3,height:16,background:"#7c3aed",borderRadius:2}}/>{children}</div>;
}
function Row({label,value,color,bold}: {label: string; value: string; color: string; bold?: boolean}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:bold?14:13,fontWeight:bold?900:600,color:bold?color:"#9ca3af"}}>{label}</span><span style={{fontSize:bold?17:14,fontWeight:900,color}}>{value}</span></div>;
}

const cardStyle: CSSProperties = {background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:15,padding:13};
const arrowBtn: CSSProperties = {background:"rgba(124,58,237,.2)",border:"1px solid rgba(124,58,237,.4)",borderRadius:8,color:"#c084fc",width:32,height:32,cursor:"pointer",fontSize:18,fontFamily:"Cairo",display:"flex",alignItems:"center",justifyContent:"center"};
const thStyle: CSSProperties = {padding:"5px 3px",textAlign:"center",fontSize:10,color:"#6b7280",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,.1)",whiteSpace:"nowrap"};
const inputStyle: CSSProperties = {background:"rgba(255,255,255,.06)",border:"1px solid rgba(124,58,237,.3)",borderRadius:10,padding:"8px 10px",color:"#e8e0ff",fontFamily:"Cairo",fontSize:13,outline:"none",width:"100%"};
const actionBtn: CSSProperties = {border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontFamily:"Cairo",fontSize:13,fontWeight:700,cursor:"pointer"};
const addRowStyle: CSSProperties = {padding:"11px 14px",background:"rgba(124,58,237,.05)",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"space-between"};