// 沉浸式场景数据：每个场景是一个英语环境，含设定、任务目标、场景词库、脚本式对话
// 对话节点字段：
//   id        节点唯一标识
//   npc       角色说的话（自动用 TTS 朗读）
//   you       用户回合（需要开口说）
//   hint      用户回合的提示句型
//   expect    期望关键词(小写子串)，识别到任一即视为通过
//   achieves  通过时勾选的目标下标数组
//   next      通过后跳转的节点 id
//   end       标记脚本结束
window.SCENES = [
  {
    id: "cafe",
    title: "Coffee Shop",
    emoji: "☕",
    tagline: "点一杯你喜欢的饮品",
    gradient: "linear-gradient(135deg,#6d4c41,#a1887f)",
    setting: "你走进一家温馨的小咖啡馆，空气里飘着烘焙咖啡豆的香味。吧台后的咖啡师抬起头，对你微笑。",
    goals: ["问候并点单", "询问价格", "付款并礼貌离开"],
    vocab: [
      { w: "espresso", ph: "/ɛˈspresoʊ/", pos: "n.", cn: "浓缩咖啡", ex: "I'd like a double espresso, please." },
      { w: "latte", ph: "/ˈlɑːteɪ/", pos: "n.", cn: "拿铁", ex: "A vanilla latte, please." },
      { w: "cappuccino", ph: "/ˌkæpəˈtʃiːnoʊ/", pos: "n.", cn: "卡布奇诺", ex: "One cappuccino to go." },
      { w: "muffin", ph: "/ˈmʌfɪn/", pos: "n.", cn: "玛芬蛋糕", ex: "Can I also get a blueberry muffin?" },
      { w: "to go", ph: "/tə ɡoʊ/", pos: "phr.", cn: "外带", ex: "That'll be for here or to go?" },
      { w: "for here", ph: "/fɔːr hɪr/", pos: "phr.", cn: "堂食", ex: "I'll drink it for here." },
      { w: "receipt", ph: "/rɪˈsiːt/", pos: "n.", cn: "收据", ex: "Could I have a receipt?" },
      { w: "tip", ph: "/tɪp/", pos: "n.", cn: "小费", ex: "Do you leave a tip here?" },
      { w: "refill", ph: "/ˈriːfɪl/", pos: "n.", cn: "续杯", ex: "Is a refill free?" },
      { w: "decaf", ph: "/ˈdiːkæf/", pos: "adj.", cn: "无咖啡因的", ex: "Make it decaf, please." }
    ],
    script: [
      { id: "n0", npc: "Hi there! Welcome to Bean & Co. What can I get for you today?", next: "u1" },
      { id: "u1", you: true, hint: "Hello! I'd like a latte, please.", expect: ["hello", "hi", "i'd like", "i would like", "can i get", "i want", "latte", "coffee", "cappuccino", "tea", "espresso", "muffin"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Sure! A latte. Would you like it for here or to go?", next: "u2" },
      { id: "u2", you: true, hint: "To go, please.", expect: ["to go", "for here", "here", "go"], achieves: [], next: "n3" },
      { id: "n3", npc: "To go it is. That'll be four fifty. Anything else?", next: "u3" },
      { id: "u3", you: true, hint: "How much is that in total?", expect: ["how much", "price", "cost", "total", "four", "fifty", "expensive", "cheap"], achieves: [1], next: "n4" },
      { id: "n4", npc: "Four dollars and fifty cents. Cash or card?", next: "u4" },
      { id: "u4", you: true, hint: "Card, please. Here you are.", expect: ["card", "cash", "here", "here you are", "pay", "please"], achieves: [2], next: "n5" },
      { id: "n5", npc: "Perfect. Here's your latte and a receipt. Have a great day!", next: "end" },
      { id: "end", npc: "（你顺利买到了咖啡，干得漂亮！✅）", end: true }
    ]
  },

  {
    id: "airport",
    title: "At the Airport",
    emoji: "✈️",
    tagline: "办理登机与安检",
    gradient: "linear-gradient(135deg,#1565c0,#4fc3f7)",
    setting: "你来到国际机场的出发大厅，巨大的电子屏滚动着航班信息。你拖着行李走到值机柜台前。",
    goals: ["出示证件值机", "托运行李", "通过安检询问"],
    vocab: [
      { w: "check-in", ph: "/ˈtʃɛk ɪn/", pos: "n.", cn: "值机", ex: "Where is the check-in counter?" },
      { w: "boarding pass", ph: "/ˈbɔːrdɪŋ pæs/", pos: "n.", cn: "登机牌", ex: "May I see your boarding pass?" },
      { w: "luggage", ph: "/ˈlʌɡɪdʒ/", pos: "n.", cn: "行李", ex: "I'd like to check this luggage." },
      { w: "carry-on", ph: "/ˈkæri ɑːn/", pos: "n.", cn: "随身行李", ex: "Is this bag carry-on?" },
      { w: "passport", ph: "/ˈpæspɔːrt/", pos: "n.", cn: "护照", ex: "Here is my passport." },
      { w: "gate", ph: "/ɡeɪt/", pos: "n.", cn: "登机口", ex: "Which gate is my flight?" },
      { w: "delay", ph: "/dɪˈleɪ/", pos: "n./v.", cn: "延误", ex: "Is the flight delayed?" },
      { w: "window seat", ph: "/ˈwɪndoʊ siːt/", pos: "n.", cn: "靠窗座位", ex: "Can I get a window seat?" },
      { w: "aisle seat", ph: "/aɪl siːt/", pos: "n.", cn: "靠走道座位", ex: "An aisle seat, please." },
      { w: "customs", ph: "/ˈkʌstəmz/", pos: "n.", cn: "海关", ex: "Customs is after baggage claim." }
    ],
    script: [
      { id: "n0", npc: "Good morning. May I see your passport and ticket, please?", next: "u1" },
      { id: "u1", you: true, hint: "Here is my passport.", expect: ["here", "passport", "ticket", "my passport", "here you are", "sure", "good morning"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Thank you. Will you be checking any bags today?", next: "u2" },
      { id: "u2", you: true, hint: "Yes, I'd like to check this suitcase.", expect: ["yes", "check", "bag", "luggage", "suitcase", "one bag", "no"], achieves: [1], next: "n3" },
      { id: "n3", npc: "No problem. Would you prefer a window or an aisle seat?", next: "u3" },
      { id: "u3", you: true, hint: "A window seat, please.", expect: ["window", "aisle", "seat", "please", "window seat", "aisle seat"], achieves: [], next: "n4" },
      { id: "n4", npc: "Window seat, great. Here is your boarding pass. Your flight leaves from Gate B12.", next: "u4" },
      { id: "u4", you: true, hint: "Where do I go for security check?", expect: ["where", "security", "gate", "how do i", "which way", "thank"], achieves: [2], next: "n5" },
      { id: "n5", npc: "Security is straight ahead, then turn left. Have a pleasant flight!", next: "end" },
      { id: "end", npc: "（值机完成，登机牌到手，出发吧！✅）", end: true }
    ]
  },

  {
    id: "hotel",
    title: "Hotel Reception",
    emoji: "🏨",
    tagline: "办理入住与咨询",
    gradient: "linear-gradient(135deg,#ad1457,#f06292)",
    setting: "你结束了一天的行程，推开门走进酒店大堂。前台接待员微笑着向你问好。",
    goals: ["办理入住", "询问早餐与设施", "请求帮助(如多要枕头)"],
    vocab: [
      { w: "reservation", ph: "/ˌrɛzərˈveɪʃən/", pos: "n.", cn: "预订", ex: "I have a reservation under Smith." },
      { w: "checkout", ph: "/ˈtʃɛk aʊt/", pos: "n.", cn: "退房", ex: "What time is checkout?" },
      { w: "room key", ph: "/ruːm kiː/", pos: "n.", cn: "房卡", ex: "Here is your room key." },
      { w: "lobby", ph: "/ˈlɑːbi/", pos: "n.", cn: "大堂", ex: "Meet me in the lobby." },
      { w: "elevator", ph: "/ˈɛlɪveɪtər/", pos: "n.", cn: "电梯", ex: "The elevator is on the right." },
      { w: "buffet", ph: "/bəˈfeɪ/", pos: "n.", cn: "自助餐", ex: "Breakfast is a buffet." },
      { w: "wifi", ph: "/ˈwaɪfaɪ/", pos: "n.", cn: "无线网", ex: "What's the wifi password?" },
      { w: "amenity", ph: "/əˈmɛnəti/", pos: "n.", cn: "便利设施", ex: "We offer many amenities." },
      { w: "pillow", ph: "/ˈpɪloʊ/", pos: "n.", cn: "枕头", ex: "Could I have an extra pillow?" },
      { w: "towel", ph: "/ˈtaʊəl/", pos: "n.", cn: "毛巾", ex: "We need more towels." }
    ],
    script: [
      { id: "n0", npc: "Good evening! Welcome to The Grand Hotel. How may I help you?", next: "u1" },
      { id: "u1", you: true, hint: "Hi, I have a reservation under Wang.", expect: ["reservation", "booking", "under", "wang", "check in", "check-in", "hi", "hello", "good evening"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Let me check… Yes, a deluxe room for two nights. May I see your ID?", next: "u2" },
      { id: "u2", you: true, hint: "Sure, here is my passport.", expect: ["here", "passport", "sure", "id", "here you are"], achieves: [], next: "n3" },
      { id: "n3", npc: "Thank you. Your room is 608. Here is your key card. Breakfast is served from 7 to 10.", next: "u3" },
      { id: "u3", you: true, hint: "What time is checkout, and is there wifi?", expect: ["wifi", "checkout", "breakfast", "what time", "password", "internet", "time"], achieves: [1], next: "n4" },
      { id: "n4", npc: "Checkout is at noon, and wifi is free. The password is on your welcome card.", next: "u4" },
      { id: "u4", you: true, hint: "Could I get an extra pillow, please?", expect: ["pillow", "towel", "extra", "help", "could", "can you", "please"], achieves: [2], next: "n5" },
      { id: "n5", npc: "Of course! I'll send one to your room right away. Enjoy your stay!", next: "end" },
      { id: "end", npc: "（顺利入住，房间与需求都搞定。✅）", end: true }
    ]
  },

  {
    id: "office",
    title: "At the Office",
    emoji: "💼",
    tagline: "开会与同事协作",
    gradient: "linear-gradient(135deg,#2e7d32,#81c784)",
    setting: "周一早晨，你走进开放式办公室，团队正准备开周会。你的同事 Sarah 朝你招手。",
    goals: ["打招呼并加入会议", "汇报进展", "提出一个建议"],
    vocab: [
      { w: "meeting", ph: "/ˈmiːtɪŋ/", pos: "n.", cn: "会议", ex: "We have a meeting at nine." },
      { w: "deadline", ph: "/ˈdɛdlaɪn/", pos: "n.", cn: "截止日期", ex: "The deadline is Friday." },
      { w: "schedule", ph: "/ˈskɛdʒuːl/", pos: "n./v.", cn: "日程/安排", ex: "Let's schedule a call." },
      { w: "progress", ph: "/ˈprɑːɡrɛs/", pos: "n.", cn: "进展", ex: "We made good progress." },
      { w: "feedback", ph: "/ˈfiːdbæk/", pos: "n.", cn: "反馈", ex: "Thanks for the feedback." },
      { w: "agenda", ph: "/əˈdʒɛndə/", pos: "n.", cn: "议程", ex: "What's on the agenda?" },
      { w: "brainstorm", ph: "/ˈbreɪnstɔːrm/", pos: "v.", cn: "头脑风暴", ex: "Let's brainstorm ideas." },
      { w: "delegate", ph: "/ˈdɛlɪɡeɪt/", pos: "v.", cn: "委派", ex: "I'll delegate the task." },
      { w: "follow up", ph: "/ˈfɑːloʊ ʌp/", pos: "phr.", cn: "跟进", ex: "I'll follow up by email." },
      { w: "priority", ph: "/praɪˈɔːrəti/", pos: "n.", cn: "优先事项", ex: "This is our top priority." }
    ],
    script: [
      { id: "n0", npc: "Sarah: Morning! Glad you're here — we're about to start the weekly meeting.", next: "u1" },
      { id: "u1", you: true, hint: "Good morning! Sorry I'm a bit late.", expect: ["good morning", "morning", "hello", "hi", "sorry", "late", "glad", "happy"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Sarah: No worries. Want to give us a quick update on your project?", next: "u2" },
      { id: "u2", you: true, hint: "Sure. We're on track, and the draft is almost done.", expect: ["sure", "update", "progress", "on track", "almost", "done", "draft", "project", "track"], achieves: [1], next: "n3" },
      { id: "n3", npc: "Sarah: Nice. The client wants the final version by Friday. Any concerns?", next: "u3" },
      { id: "u3", you: true, hint: "I suggest we split the work to hit the deadline.", expect: ["suggest", "propose", "idea", "split", "delegate", "deadline", "recommend", "think", "maybe"], achieves: [2], next: "n4" },
      { id: "n4", npc: "Sarah: Good call. Let's delegate the design to Tom and you handle writing.", next: "u4" },
      { id: "u4", you: true, hint: "Sounds good. I'll follow up with Tom after the meeting.", expect: ["sounds good", "agree", "perfect", "ok", "okay", "follow up", "great", "deal"], achieves: [], next: "n5" },
      { id: "n5", npc: "Sarah: Perfect. Thanks, everyone — let's get to work!", next: "end" },
      { id: "end", npc: "（会议顺利，你的汇报和建议都被采纳。✅）", end: true }
    ]
  },

  {
    id: "doctor",
    title: "At the Doctor",
    emoji: "🩺",
    tagline: "描述症状与问诊",
    gradient: "linear-gradient(135deg,#00838f,#4dd0e1)",
    setting: "你感觉不太舒服，来到社区诊所。护士把你领进诊室，医生放下钢笔，看向你。",
    goals: ["描述症状", "回答医生的问题", "听懂医嘱并取药"],
    vocab: [
      { w: "symptom", ph: "/ˈsɪmptəm/", pos: "n.", cn: "症状", ex: "What are your symptoms?" },
      { w: "fever", ph: "/ˈfiːvər/", pos: "n.", cn: "发烧", ex: "I have a high fever." },
      { w: "cough", ph: "/kɔːf/", pos: "n./v.", cn: "咳嗽", ex: "I've had a cough for days." },
      { w: "prescription", ph: "/prɪˈskrɪpʃən/", pos: "n.", cn: "处方", ex: "Take this prescription to the pharmacy." },
      { w: "allergy", ph: "/ˈælərdʒi/", pos: "n.", cn: "过敏", ex: "Do you have any allergies?" },
      { w: "dose", ph: "/doʊs/", pos: "n.", cn: "剂量", ex: "Take one dose after meals." },
      { w: "headache", ph: "/ˈhɛdeɪk/", pos: "n.", cn: "头痛", ex: "I have a terrible headache." },
      { w: "throat", ph: "/θroʊt/", pos: "n.", cn: "喉咙", ex: "My throat is sore." },
      { w: "rest", ph: "/rɛst/", pos: "n./v.", cn: "休息", ex: "You should get more rest." },
      { w: "recover", ph: "/rɪˈkʌvər/", pos: "v.", cn: "康复", ex: "You'll recover in a few days." }
    ],
    script: [
      { id: "n0", npc: "Doctor: Hello. What seems to be the problem today?", next: "u1" },
      { id: "u1", you: true, hint: "I have a sore throat and a fever.", expect: ["throat", "fever", "cough", "headache", "sore", "sick", "pain", "not feeling", "hello", "hi"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Doctor: I'm sorry to hear that. How long have you felt this way?", next: "u2" },
      { id: "u2", you: true, hint: "Since yesterday morning.", expect: ["yesterday", "days", "week", "morning", "two", "three", "since", "today"], achieves: [1], next: "n3" },
      { id: "n3", npc: "Doctor: Do you have any allergies to medicine?", next: "u3" },
      { id: "u3", you: true, hint: "No, I don't have any allergies.", expect: ["no", "yes", "allerg", "penicillin", "none", "don't", "do not"], achieves: [1], next: "n4" },
      { id: "n4", npc: "Doctor: Good. I'll give you a prescription. Take one pill twice a day after meals, and rest well.", next: "u4" },
      { id: "u4", you: true, hint: "Thank you. Where can I get the medicine?", expect: ["where", "pharmacy", "medicine", "prescription", "thank", "how", "get"], achieves: [2], next: "n5" },
      { id: "n5", npc: "Doctor: The pharmacy is on the first floor. You should recover in about three days. Take care!", next: "end" },
      { id: "end", npc: "（问诊结束，你听懂了医嘱并知道去哪取药。✅）", end: true }
    ]
  },

  {
    id: "street",
    title: "Asking for Directions",
    emoji: "🗺️",
    tagline: "在街头问路与导航",
    gradient: "linear-gradient(135deg,#f9a825,#ffd54f)",
    setting: "你在一个陌生城市的街角，手里攥着地图却找不到目的地。一位路过的当地人停下脚步。",
    goals: ["礼貌开口问路", "听懂路线指示", "确认并道谢"],
    vocab: [
      { w: "block", ph: "/blɑːk/", pos: "n.", cn: "街区", ex: "It's two blocks away." },
      { w: "intersection", ph: "/ˌɪntərˈsɛkʃən/", pos: "n.", cn: "十字路口", ex: "Turn left at the intersection." },
      { w: "straight", ph: "/streɪt/", pos: "adv.", cn: "直走", ex: "Go straight ahead." },
      { w: "corner", ph: "/ˈkɔːrnər/", pos: "n.", cn: "拐角", ex: "It's on the corner." },
      { w: "landmark", ph: "/ˈlændmɑːrk/", pos: "n.", cn: "地标", ex: "Look for the red bridge." },
      { w: "crosswalk", ph: "/ˈkrɔːswɔːk/", pos: "n.", cn: "人行横道", ex: "Use the crosswalk." },
      { w: "nearby", ph: "/ˈnɪrbaɪ/", pos: "adv.", cn: "附近", ex: "Is there a bank nearby?" },
      { w: "opposite", ph: "/ˈɑːpəzɪt/", pos: "prep.", cn: "在…对面", ex: "It's opposite the station." },
      { w: "far", ph: "/fɑːr/", pos: "adj.", cn: "远的", ex: "Is it far from here?" },
      { w: "minutes", ph: "/ˈmɪnɪts/", pos: "n.", cn: "分钟", ex: "It's a five-minute walk." }
    ],
    script: [
      { id: "n0", npc: "Local: Hey, you look a bit lost. Need a hand?", next: "u1" },
      { id: "u1", you: true, hint: "Yes, excuse me. How do I get to the museum?", expect: ["excuse me", "hello", "hi", "yes", "sorry", "museum", "how", "get to", "where", "lost", "help"], achieves: [0], next: "n2" },
      { id: "n2", npc: "Local: Sure! Go straight for two blocks, then turn right at the traffic light.", next: "u2" },
      { id: "u2", you: true, hint: "Straight, then right at the light?", expect: ["straight", "right", "left", "turn", "light", "block", "corner", "yes", "repeat", "again"], achieves: [1], next: "n3" },
      { id: "n3", npc: "Local: Exactly. It's on your left, next to the big fountain. About a five-minute walk.", next: "u3" },
      { id: "u3", you: true, hint: "Got it, thank you so much!", expect: ["thank", "got it", "understand", "clear", "great", "perfect", "thanks", "okay", "ok"], achieves: [2], next: "n4" },
      { id: "n4", npc: "Local: No problem. Enjoy your visit!", next: "end" },
      { id: "end", npc: "（你成功问到了路，方向已清楚。✅）", end: true }
    ]
  }
];
