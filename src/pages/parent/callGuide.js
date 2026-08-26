/**
 * The call protocol, transcribed from the school's own working documents:
 *
 *   • رهنمود تماس تلیفونی با والدین — مکتب وفاق  (the six-step call structure)
 *   • راهنمای جامع ارتباط با اولیای متعلمین §8  (preparation, structure, and
 *     the "never do this on a call" list)
 *   • Phone Script for Winter School Follow-Up   (winter talking points and
 *     the objection answers)
 *
 * Kept as data, not prose baked into a component, so the same content can sit
 * in the reference page AND in the panel beside the form the officer fills in
 * while the call is still live. The wording is the school's, unchanged — this
 * is a transcription, not a rewrite.
 */

/** §8.1 — what to have in front of you before dialling. */
export const PREPARATION = [
  "معلومات متعلم را آماده کنید: نام، صنف، استاد رهنما، وضعیت فیس",
  "موضوع و نکات اساسی را روی کاغذ یا صفحه نوت‌برداری بنویسید",
  "در ذهن، پاسخ‌های احتمالی ولی را پیش‌بینی کنید",
  "محل آرام و خصوصی برای تماس انتخاب کنید",
];

/** §8.2 — the seven steps, in order. */
export const CALL_STEPS = [
  {
    step: 1,
    title: "سلام و احوال‌پرسی",
    en: "Greeting",
    script: "السلام علیکم و رحمة الله و برکاته. خوب هستید؟ خانواده خوب هستند؟",
  },
  {
    step: 2,
    title: "شناسایی زبان",
    en: "Identify the language",
    script: "ببخشید، دری صحبت می‌کنید یا پشتو؟ هرکدام راحت‌تر هستید.",
  },
  {
    step: 3,
    title: "معرفی خود",
    en: "Introduce yourself",
    script:
      "من [نام] هستم، مسؤل ارتباطات با اولیا در مکتب وفاق. در مورد [نام متعلم] که شاگرد صنف [...] است، تماس گرفتم.",
  },
  {
    step: 4,
    title: "اجازه گرفتن",
    en: "Ask permission",
    script:
      "اگر چند دقیقه وقت دارید، می‌خواستم در مورد [موضوع کلی] صحبت کنیم. یا اگر وقت بهتری برای شما هست، خبر دهید تا در آن وقت تماس بگیرم.",
  },
  {
    step: 5,
    title: "مکالمه اصلی",
    en: "The conversation",
    script: "واضح و کوتاه. اول نکته خوب را بگویید (اگر هست)، بعد نکته اصلی. در ضمن، یادداشت بگیرید از پاسخ‌ها و نگرانی‌ها.",
  },
  {
    step: 6,
    title: "خلاصه و قدم بعدی",
    en: "Summarise and agree the next step",
    script:
      "خلاصه: ما توافق کردیم که [...]. من از طرف خود [...] می‌کنم، و از شما هم خواهش می‌کنم که [...].",
  },
  {
    step: 7,
    title: "ختم",
    en: "Close",
    script: "تشکر از وقت‌تان. اگر سؤالی داشتید، در هر وقت در خدمت‌تان هستم. خدا نگه‌دار.",
  },
];

/** §8.3 — the things that end a call badly. Listed as prohibitions on purpose. */
export const NEVER_DO = [
  "نام بنیادگذار / رئیس وفاق را به عنوان مرجع مطرح نکنید — همیشه «مسؤلان مربوطه» یا «اداره مکتب»",
  "وعده مالی (تخفیف، بخشش فیس، تأخیر فیس) از خود ندهید",
  "درباره متعلم دیگر صحبت نکنید",
  "در حضور دیگران تماس را روی اسپیکر نگذارید",
  "اطلاعات داخلی مکتب را افشا نکنید",
  "در مقابل لحن تند ولی، تند نشوید — آرام، محترم، با حوصله",
  "اگر جواب سؤالی را نمی‌دانید، نسازید: «بررسی می‌کنم و در ظرف ___ ساعت با شما تماس می‌گیرم»",
];

/** §2.6 — corrective language, never critical. The table from the handbook. */
export const LANGUAGE_SWAPS = [
  {
    dont: "«شاگرد شما کار خانگی نمی‌کند»",
    do: "«در پیگیری کار خانگی، نیاز به همکاری بیشتر شما داریم»",
  },
  {
    dont: "«والدین در پر کردن فورم سستی می‌کنند»",
    do: "«برای آنکه ارزیابی متعلم کامل باشد، فورم‌ها به تکمیل شما نیاز دارد»",
  },
  {
    dont: "«این رفتار قابل قبول نیست»",
    do: "«این رفتار را با هم بررسی کنیم تا ببینیم چه تغییری در آن آورده می‌توانیم»",
  },
];

/** Winter-programme talking points, from the phone script. */
export const WINTER_POINTS = [
  { point: "Full curriculum", script: "تمام مضامین سال آینده تدریس می‌شود — انگلیسی، ریاضی، ساینس، همه چیز" },
  { point: "Purpose", script: "هدف این است که شاگردان را برای سال آینده آماده‌تر کنیم و نقاط ضعف شان را تقویت کنیم" },
  { point: "Unique", script: "این برنامه در افغانستان کم نظیر است — ما تعلیم ۱۲ ماهه ارائه می‌کنیم، نه فقط ۹ ماه رسمی" },
  { point: "Transport", script: "ترانسپورت هم داریم" },
  { point: "Fee", script: "فیس ۵۰٪ تخفیف دارد چون سال رسمی نیست، اما خدمات ما همان است" },
  { point: "Social", script: "همصنفی‌های شان اینجا هستند، زمین فوتبال جدید و باسکتبال باز شده، فعالیت‌های زمستانی زیاد داریم" },
];

/** The four objections that actually come up, and the answers agreed for them. */
export const OBJECTIONS = [
  {
    objection: "«فیس زیاد است»",
    en: "Fees are too much",
    answer: "فهمیدیم. فیس ۵۰٪ تخفیف دارد و خدمات عین سال عادی است. اگر مشکل مالی خاص دارید، با اداره صحبت کنید.",
  },
  {
    objection: "«طفل استراحت می‌کند / بازی می‌کند»",
    en: "Child is resting or playing",
    answer: "بلی، استراحت هم لازم است. اما تربیه کار مسلسل می‌خواهد. اگر سه ماه فاصله بیفتد، شاگرد عقب می‌ماند.",
  },
  {
    objection: "«خبر نداشتیم»",
    en: "Didn't know about it",
    answer: "حق دارید، شاید ما خوب اطلاع نداده بودیم. حالا که می‌دانید، اگر خواستید امتحان کنید، ما اینجا هستیم.",
  },
  {
    objection: "«یک ماه گذشته است»",
    en: "Already one month passed",
    answer: "مشکل نیست. هنوز دو ماه باقی است. می‌تواند از هفته آینده شروع کند.",
  },
];

/** The card the officer keeps beside the phone. */
export const QUICK_REFERENCE = [
  { label: "Time", value: "۸:۳۰ - ۱۲:۳۰" },
  { label: "Days", value: "شش روز هفته (شنبه تا پنجشنبه)" },
  { label: "Fee", value: "۵۰٪ تخفیف" },
  { label: "Transport", value: "بلی، داریم" },
  { label: "Contact", value: "0745329195" },
];

/**
 * §3.4 — who decides what. The single most useful thing on this page: it stops
 * a call being answered with a promise the caller was never entitled to make.
 */
export const ESCALATION = [
  { level: "تماس روزمره، یادآوری، اطلاع‌رسانی", owner: "شما — مستقل" },
  { level: "تماس درباره پیشرفت درسی متعلم", owner: "با هماهنگی استاد رهنما / معلم مضمون" },
  { level: "نگرانی تربیتی متعلم", owner: "بخش تربیتی — فایل بگیرید، بعد تماس" },
  { level: "شکایت رسمی ولی", owner: "ثبت و انتقال به معاونت تربیتی" },
  { level: "مسأله سنگین (آسیب، تخلف، بحران خانوادگی)", owner: "فوراً به معاونت تربیتی — توقف اقدام شخصی" },
  { level: "مسأله مالی", owner: "به بخش مالی ارجاع — هرگز خود تصمیم نگیرید" },
  { level: "اعلامیه رسمی مکتب", owner: "فقط با تأیید مسؤلان مربوطه" },
];

/**
 * Ready-made openings for the recurring contacts, from ضمیمه الف and the
 * winter script. Each one fills the subject + message on the form so the
 * officer starts from the agreed wording instead of a blank box.
 */
export const MESSAGE_TEMPLATES = [
  {
    key: "winter",
    label: "Winter programme follow-up",
    category: "informational",
    subject: "برنامه زمستانی — احوال‌پرسی و معلومات",
    message:
      "ما یک ماه است که برنامه زمستانی را شروع کردیم و می‌خواستیم حال احوال شاگردان مان را بپرسیم.\n" +
      "پرسش‌ها: [نام متعلم] این روزها چه کار می‌کند؟ آیا جایی ثبت نام کرده — کورس انگلیسی، ریاضی، یا چیز دیگر؟ " +
      "اگر جایی می‌رود، چطور پیش می‌رود؟ آیا از طرف ما کمک یا رهنمایی لازم دارید؟\n" +
      "ما می‌خواهیم بدانیم شاگردان مان در زمستان چه می‌کنند تا در سیستم خود ثبت کنیم و بهتر از وضعیت شان خبر داشته باشیم.",
  },
  {
    key: "absence",
    label: "Unexplained absence",
    category: "accountability",
    subject: "غیرحاضری بدون اطلاع",
    message:
      "اطلاع داده شد که متعلم در روزهای اخیر بدون اطلاع غایب بوده و علت آن پرسیده شد. " +
      "به والدین اطمینان داده شد که در صورت داشتن هرگونه مشکل، مکتب آماده همکاری است.",
  },
  {
    key: "care",
    label: "Periodic care call",
    category: "care",
    subject: "احوال‌پرسی دوره‌ای",
    message:
      "تماس مراقبتی دوره‌ای جهت احوال‌پرسی متعلم و خانواده. " +
      "پرسش از وضعیت خانه: خواب، غذا، وقت‌گذرانی، و رابطه با خانواده.",
  },
  {
    key: "congratulation",
    label: "Congratulation call",
    category: "care",
    subject: "تماس تبریک",
    message: "تبریک به خاطر [دستاورد متعلم] و تشکر از همکاری خانواده در این مسیر.",
  },
  {
    key: "meeting",
    label: "Parent meeting invitation",
    category: "informational",
    subject: "اطلاعیه جلسه والدین",
    message:
      "اطلاعیه جلسه والدین: تاریخ [...]، وقت [...]، مکان [...]. اجندا: [...].\n" +
      "خواهشمندیم حضور خود را تأیید فرمایید.",
  },
  {
    key: "form_reminder",
    label: "Parent form reminder",
    category: "coordination",
    subject: "یادآوری فورم دوهفته‌ای والدین",
    message:
      "السلام علیکم. می‌خواستیم یادآور شویم که فورم دوهفته‌ای [نام متعلم] هنوز به دست ما نرسیده. " +
      "اگر در پر کردن آن سؤال یا مشکلی دارید، در خدمت‌تان هستیم.",
  },
  {
    key: "welcome",
    label: "Start-of-year welcome",
    category: "informational",
    subject: "پیام خوش‌آمدید آغاز سال",
    message:
      "السلام علیکم و رحمة الله. خانواده محترم،\n" +
      "با سلام و احترام، آغاز سال تعلیمی جدید را به شما تبریک می‌گوییم. " +
      "مکتب وفاق در همراهی [نام متعلم] در این سال، در خدمت شماست.\n" +
      "در طول سال، ما با شما در تماس فعال خواهیم بود — برای اطلاع از پیشرفت، هماهنگی برنامه‌ها، و دریافت بازخورد شما.",
  },
];
