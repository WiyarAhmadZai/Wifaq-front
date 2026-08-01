import { useState, useEffect } from "react";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { DateField } from "../../components/hr/HrUI";

/* ── i18n ─────────────────────────────────────────────────────────────────
 * Three languages: English (en), Pashto (ps), Dari (fa). Pashto & Dari are
 * RTL and rendered with the Vazirmatn font (loaded in index.html).
 * t(key, vars) → translated string with {placeholder} interpolation.
 */
const RTL_FONT = "Vazirmatn, 'Noto Naskh Arabic', Tahoma, Arial, sans-serif";
const LANGS = [
  { code: "en", label: "English" },
  { code: "ps", label: "پښتو" },
  { code: "fa", label: "دری" },
];

const L = {
  en: {
    now_hiring: "Now Hiring", hero_title: "Join the Wifaq School Family",
    hero_desc: "We're building a team that inspires the next generation. Complete the form below and our recruitment team will be in touch with the next steps.",
    step_of: "Step {x} of {y}:",
    step1: "Position", step1d: "Choose the role you're applying for",
    step2: "Job Details", step2d: "Everything about the role you picked",
    step3: "About You", step3d: "Personal information & introduction",
    step4: "Social", step4d: "Social media profiles (optional)",
    step5: "Motivation", step5d: "Why this role and what you bring",
    step6: "Education", step6d: "Your educational background",
    step7: "Experience", step7d: "Work history & responsibilities",
    step8: "Documents", step8d: "Upload your CV and credentials",
    jd_overview: "Job Overview", jd_description: "Job Description", jd_requirements: "Requirements & Qualifications",
    jd_department: "Department", jd_employment: "Employment Type", jd_location: "Location",
    jd_positions: "Open Positions", jd_experience: "Experience Required", jd_deadline: "Application Deadline",
    jd_reporting: "Reports To", jd_posted: "Posted On", jd_position_title: "Position Title",
    jd_no_desc: "No detailed description was provided for this position.",
    jd_no_req: "No specific requirements were listed for this position.",
    jd_note: "Read through the details below. When you're ready, continue to start your application.",
    jd_change: "Choose a different position", jd_apply: "Apply for this Position",
    jd_closed: "The application deadline for this position has passed.",
    jd_none: "Please go back and select a position first.",
    jd_min_yrs: "{n}+ years", jd_n_positions: "{n} position(s)", jd_not_specified: "Not specified",
    full_name: "Full Name", contact_number: "Contact Number", email: "Email",
    dob: "Date of Birth", current_address: "Current Address", place_of_origin: "Place of Origin",
    introduction: "Brief Introduction", social_note: "These fields are optional. Share what you're comfortable with.",
    why_role: "Why do you want this role?", unique_skills: "Unique Skills", add_skill: "Add Skill", skill_n: "Skill {n}",
    education_level: "Education Level", field_of_study: "Field of Study", institution: "Institution Name",
    total_exp: "Total Experience (Years)", experience_n: "Experience {n}",
    company: "Company Name", job_title: "Job Title", duration: "Duration (e.g. 2020 - 2022)",
    responsibilities: "Key responsibilities", add_experience: "+ Add Work Experience",
    job_requirements: "Job Requirements", req_note: "Check the requirements you meet for this position.",
    max_file: "Max 10MB — PDF, JPG, PNG", upload: "Upload", change: "Change",
    review: "Review Summary", years: "{n} years",
    s_job: "Job Posting", s_applicant: "Applicant", s_email: "Email", s_contact: "Contact", s_education: "Education", s_experience: "Experience",
    back: "Back", continue: "Continue", submit: "Submit Application", submitting: "Submitting…",
    open_positions: "{n} Open Positions", open_position: "{n} Open Position", choose_role: "Choose the role that matches your skills.",
    search_positions: "Search positions…", no_match: 'No positions match "{q}"', clear_search: "Clear search",
    no_positions: "No open positions at the moment", check_back: "Please check back soon — we post new opportunities regularly.",
    closed: "Closed", closes_today: "Closes today", days_left: "{n} days left", day_left: "1 day left", closes_on: "Closes {d}",
    n_open: "{n} open", n_yrs: "{n}+ yrs",
    received_title: "Application Received", thank_you: "Thank you for applying to Wifaq School.",
    received_body: "We've received your application and our recruitment team will review it shortly. If your profile is a match, we'll reach out to you by email or phone to schedule the next steps.",
    reference_id: "Reference ID", submit_another: "Submit Another Application",
    portal: "Careers · Application Portal", secure: "Secure & private", loading: "Loading career opportunities…",
    rights: "© {y} Wifaq School. All rights reserved.", confidential: "Your information is handled in confidence and used only for recruitment.",
    select_edu: "Select Education Level", edu_g12: "Grade 12 / Baccalaureate", edu_dip: "Diploma / Post-baccalaureate",
    edu_ba: "Bachelor's Degree", edu_ma: "Master's Degree", edu_phd: "Doctorate", edu_other: "Other",
    doc_cv: "CV / Resume", doc_edu: "Educational Documents", doc_id: "ID Card or Passport", doc_work: "Work Samples",
    ph_name: "e.g. Ahmad Rahimi", ph_phone: "e.g. +93 770 123 456", ph_email: "e.g. ahmad@example.com",
    ph_address: "Full address", ph_origin: "City / Province", ph_intro: "Tell us a little about yourself…",
    ph_profile: "Profile URL", ph_username: "@username", ph_channel: "Channel URL",
    ph_motivation: "Share your motivation, what excites you about the role, and what makes you a great fit…",
    ph_field: "e.g. Computer Science", ph_institution: "University / School name",
    e_job: "Please select a job posting", e_name: "Full name is required", e_phone: "Contact number is required",
    e_email: "Email is required", e_dob: "Date of birth is required", e_address: "Current address is required",
    e_origin: "Place of origin is required", e_intro: "Please introduce yourself", e_motivation: "Motivation is required",
    e_edu: "Education level is required", e_field: "Field of study is required", e_institution: "Institution name is required",
    e_required: "{x} is required", file_too_large: "File too large", max_size: "Maximum file size is 10MB.",
    submit_failed: "Submission failed", went_wrong: "Something went wrong. Please try again.",
  },
  ps: {
    now_hiring: "اوس استخدام", hero_title: "د وفاق ښوونځي کورنۍ سره یوځای شئ",
    hero_desc: "موږ داسې ټیم جوړوو چې راتلونکی نسل الهام بخښي. لاندې فورمه ډکه کړئ او زموږ د استخدام ټیم به درسره اړیکه ونیسي.",
    step_of: "{x} له {y} مرحله:",
    step1: "بست", step1d: "هغه بست وټاکئ چې غوښتنه یې کوئ",
    step2: "د بست تفصیل", step2d: "د ټاکل شوي بست بشپړ معلومات",
    step3: "ستاسو په اړه", step3d: "شخصي معلومات او پیژندنه",
    step4: "ټولنیزې رسنۍ", step4d: "د ټولنیزو رسنیو پروفایلونه (اختیاري)",
    step5: "انګیزه", step5d: "ولې دا بست او څه وړاندې کوئ",
    step6: "زده‌کړې", step6d: "ستاسو تحصیلي شالید",
    step7: "تجربه", step7d: "د کار سابقه او مسؤلیتونه",
    step8: "اسناد", step8d: "خپل سي‌وي او اسناد پورته کړئ",
    jd_overview: "د بست لنډیز", jd_description: "د بست تشریح", jd_requirements: "شرایط او وړتیاوې",
    jd_department: "څانګه", jd_employment: "د دندې ډول", jd_location: "ځای",
    jd_positions: "خلاص بستونه", jd_experience: "اړینه تجربه", jd_deadline: "د غوښتنلیک وروستۍ نېټه",
    jd_reporting: "راپور ورکول", jd_posted: "د خپرېدو نېټه", jd_position_title: "د بست عنوان",
    jd_no_desc: "د دې بست لپاره تفصیلي تشریح نه ده ورکړل شوې.",
    jd_no_req: "د دې بست لپاره ځانګړي شرایط نه دي لیست شوي.",
    jd_note: "لاندې معلومات ولولئ. کله چې چمتو شوئ، خپل غوښتنلیک پیل کړئ.",
    jd_change: "بل بست غوره کول", jd_apply: "دې بست ته غوښتنه کول",
    jd_closed: "د دې بست لپاره د غوښتنلیک وروستۍ نېټه تېره شوې ده.",
    jd_none: "مهرباني وکړئ بیرته لاړ شئ او لومړی یو بست وټاکئ.",
    jd_min_yrs: "{n}+ کاله", jd_n_positions: "{n} بستونه", jd_not_specified: "نه دی ټاکل شوی",
    full_name: "بشپړ نوم", contact_number: "د اړیکې شمېره", email: "ایمیل",
    dob: "د زیږېدنې نېټه", current_address: "اوسنۍ پته", place_of_origin: "اصلي ځای",
    introduction: "لنډه پیژندنه", social_note: "دا برخې اختیاري دي. هغه څه چې راحت یاست شریک یې کړئ.",
    why_role: "ولې دا بست غواړئ؟", unique_skills: "ځانګړي مهارتونه", add_skill: "مهارت ورزیاتول", skill_n: "مهارت {n}",
    education_level: "د زده‌کړې کچه", field_of_study: "د زده‌کړې څانګه", institution: "د مؤسسې نوم",
    total_exp: "ټوله تجربه (کلونه)", experience_n: "تجربه {n}",
    company: "د شرکت نوم", job_title: "د دندې عنوان", duration: "موده (لکه ۲۰۲۰ - ۲۰۲۲)",
    responsibilities: "اصلي مسؤلیتونه", add_experience: "+ د کار تجربه ورزیاتول",
    job_requirements: "د بست شرایط", req_note: "هغه شرایط چې پوره کوئ نښه یې کړئ.",
    max_file: "تر ۱۰ MB — PDF, JPG, PNG", upload: "پورته کول", change: "بدلول",
    review: "د بیاکتنې لنډیز", years: "{n} کلونه",
    s_job: "بست", s_applicant: "غوښتونکی", s_email: "ایمیل", s_contact: "اړیکه", s_education: "زده‌کړې", s_experience: "تجربه",
    back: "بیرته", continue: "دوام", submit: "غوښتنلیک لېږل", submitting: "د لېږلو په حال کې…",
    open_positions: "{n} خلاص بستونه", open_position: "{n} خلاص بست", choose_role: "هغه بست وټاکئ چې ستاسو مهارتونو سره سمون لري.",
    search_positions: "د بستونو لټون…", no_match: '"{q}" سره هیڅ بست سمون نه لري', clear_search: "لټون پاکول",
    no_positions: "اوس مهال هیڅ خلاص بست نشته", check_back: "مهرباني وکړئ ژر بیا وګورئ — موږ په منظمه توګه نوي فرصتونه خپروو.",
    closed: "تړل شوی", closes_today: "نن تړل کیږي", days_left: "{n} ورځې پاتې", day_left: "۱ ورځ پاتې", closes_on: "په {d} تړل کیږي",
    n_open: "{n} خلاص", n_yrs: "{n}+ کاله",
    received_title: "غوښتنلیک ترلاسه شو", thank_you: "د وفاق ښوونځي ته ستاسو د غوښتنې مننه.",
    received_body: "موږ ستاسو غوښتنلیک ترلاسه کړ او زموږ د استخدام ټیم به یې ژر وڅیړي. که ستاسو پروفایل مناسب وي، د بریښنالیک یا تلیفون له لارې به درسره اړیکه ونیسو.",
    reference_id: "د مرجع شمېره", submit_another: "بل غوښتنلیک لېږل",
    portal: "دندې · د غوښتنلیک پورټال", secure: "خوندي او محرم", loading: "د دندو فرصتونه بارېږي…",
    rights: "© {y} وفاق ښوونځی. ټول حقونه خوندي دي.", confidential: "ستاسو معلومات محرم ساتل کیږي او یوازې د استخدام لپاره کارول کیږي.",
    select_edu: "د زده‌کړې کچه وټاکئ", edu_g12: "۱۲ ټولګی / بکلوریا", edu_dip: "ډیپلوم / د بکلوریا وروسته",
    edu_ba: "لیسانس", edu_ma: "ماسټري", edu_phd: "دکتورا", edu_other: "نور",
    doc_cv: "سي‌وي / ژوندلیک", doc_edu: "تحصیلي اسناد", doc_id: "تذکره یا پاسپورټ", doc_work: "د کار بېلګې",
    ph_name: "لکه احمد رحیمي", ph_phone: "لکه +93 770 123 456", ph_email: "لکه ahmad@example.com",
    ph_address: "بشپړه پته", ph_origin: "ښار / ولایت", ph_intro: "لږ څه د ځان په اړه ولیکئ…",
    ph_profile: "د پروفایل لینک", ph_username: "@کارن‌نوم", ph_channel: "د چینل لینک",
    ph_motivation: "خپله انګیزه، هغه څه چې تاسو هڅوي او ولې تاسو مناسب یاست شریک یې کړئ…",
    ph_field: "لکه کمپیوټر ساینس", ph_institution: "د پوهنتون / ښوونځي نوم",
    e_job: "مهرباني وکړئ یو بست وټاکئ", e_name: "بشپړ نوم اړین دی", e_phone: "د اړیکې شمېره اړینه ده",
    e_email: "ایمیل اړین دی", e_dob: "د زیږېدنې نېټه اړینه ده", e_address: "اوسنۍ پته اړینه ده",
    e_origin: "اصلي ځای اړین دی", e_intro: "مهرباني وکړئ ځان وپیژنئ", e_motivation: "انګیزه اړینه ده",
    e_edu: "د زده‌کړې کچه اړینه ده", e_field: "د زده‌کړې څانګه اړینه ده", e_institution: "د مؤسسې نوم اړین دی",
    e_required: "{x} اړین دی", file_too_large: "فایل ډېر لوی دی", max_size: "تر ۱۰ MB پورې فایل.",
    submit_failed: "لېږل ناکام شول", went_wrong: "یوه ستونزه رامنځته شوه. بیا هڅه وکړئ.",
  },
  fa: {
    now_hiring: "در حال استخدام", hero_title: "به خانواده مکتب وفاق بپیوندید",
    hero_desc: "ما تیمی می‌سازیم که نسل بعدی را الهام می‌بخشد. فرم زیر را تکمیل کنید و تیم استخدام با شما در تماس خواهد شد.",
    step_of: "مرحله {x} از {y}:",
    step1: "بست", step1d: "بستی را که می‌خواهید انتخاب کنید",
    step2: "جزئیات بست", step2d: "معلومات کامل بست انتخاب‌شده",
    step3: "درباره شما", step3d: "معلومات شخصی و معرفی",
    step4: "شبکه‌های اجتماعی", step4d: "پروفایل‌های شبکه‌های اجتماعی (اختیاری)",
    step5: "انگیزه", step5d: "چرا این بست و چه چیزی ارائه می‌دهید",
    step6: "تحصیلات", step6d: "پیشینه تحصیلی شما",
    step7: "تجربه", step7d: "سابقه کاری و مسئولیت‌ها",
    step8: "اسناد", step8d: "بارگذاری رزومه و مدارک",
    jd_overview: "خلاصه بست", jd_description: "شرح وظایف بست", jd_requirements: "شرایط و شایستگی‌ها",
    jd_department: "بخش", jd_employment: "نوع استخدام", jd_location: "موقعیت",
    jd_positions: "بست‌های باز", jd_experience: "تجربه مورد نیاز", jd_deadline: "آخرین مهلت درخواست",
    jd_reporting: "گزارش‌دهی به", jd_posted: "تاریخ نشر", jd_position_title: "عنوان بست",
    jd_no_desc: "برای این بست شرح تفصیلی ارائه نشده است.",
    jd_no_req: "برای این بست شرایط مشخصی فهرست نشده است.",
    jd_note: "معلومات زیر را مطالعه کنید. هر وقت آماده بودید، درخواست خود را آغاز کنید.",
    jd_change: "انتخاب بست دیگر", jd_apply: "درخواست برای این بست",
    jd_closed: "مهلت درخواست برای این بست به پایان رسیده است.",
    jd_none: "لطفاً بازگردید و ابتدا یک بست را انتخاب کنید.",
    jd_min_yrs: "{n}+ سال", jd_n_positions: "{n} بست", jd_not_specified: "مشخص نشده",
    full_name: "نام کامل", contact_number: "شماره تماس", email: "ایمیل",
    dob: "تاریخ تولد", current_address: "آدرس فعلی", place_of_origin: "محل اصلی",
    introduction: "معرفی کوتاه", social_note: "این فیلدها اختیاری هستند. آنچه راحت هستید به اشتراک بگذارید.",
    why_role: "چرا این بست را می‌خواهید؟", unique_skills: "مهارت‌های ویژه", add_skill: "افزودن مهارت", skill_n: "مهارت {n}",
    education_level: "سطح تحصیلات", field_of_study: "رشته تحصیلی", institution: "نام موسسه",
    total_exp: "مجموع تجربه (سال)", experience_n: "تجربه {n}",
    company: "نام شرکت", job_title: "عنوان شغل", duration: "مدت (مثلاً ۲۰۲۰ - ۲۰۲۲)",
    responsibilities: "مسئولیت‌های اصلی", add_experience: "+ افزودن تجربه کاری",
    job_requirements: "شرایط بست", req_note: "شرایطی را که برآورده می‌کنید علامت بزنید.",
    max_file: "حداکثر ۱۰ مگابایت — PDF, JPG, PNG", upload: "بارگذاری", change: "تغییر",
    review: "خلاصه بازبینی", years: "{n} سال",
    s_job: "بست", s_applicant: "متقاضی", s_email: "ایمیل", s_contact: "تماس", s_education: "تحصیلات", s_experience: "تجربه",
    back: "بازگشت", continue: "ادامه", submit: "ارسال درخواست", submitting: "در حال ارسال…",
    open_positions: "{n} بست باز", open_position: "{n} بست باز", choose_role: "بستی را که با مهارت‌های شما مطابقت دارد انتخاب کنید.",
    search_positions: "جستجوی بست‌ها…", no_match: 'هیچ بستی با "{q}" مطابقت ندارد', clear_search: "پاک کردن جستجو",
    no_positions: "در حال حاضر بست بازی وجود ندارد", check_back: "لطفاً به‌زودی دوباره سر بزنید — ما به‌طور منظم فرصت‌های جدید منتشر می‌کنیم.",
    closed: "بسته شد", closes_today: "امروز بسته می‌شود", days_left: "{n} روز باقی‌مانده", day_left: "۱ روز باقی‌مانده", closes_on: "بسته شدن در {d}",
    n_open: "{n} باز", n_yrs: "{n}+ سال",
    received_title: "درخواست دریافت شد", thank_you: "از درخواست شما به مکتب وفاق سپاسگزاریم.",
    received_body: "ما درخواست شما را دریافت کردیم و تیم استخدام ما به‌زودی آن را بررسی خواهد کرد. اگر پروفایل شما مناسب باشد، از طریق ایمیل یا تلفن برای مراحل بعدی با شما تماس خواهیم گرفت.",
    reference_id: "شماره مرجع", submit_another: "ارسال درخواست دیگر",
    portal: "فرصت‌های شغلی · پورتال درخواست", secure: "امن و محرمانه", loading: "در حال بارگذاری فرصت‌های شغلی…",
    rights: "© {y} مکتب وفاق. تمام حقوق محفوظ است.", confidential: "اطلاعات شما محرمانه نگهداری شده و فقط برای استخدام استفاده می‌شود.",
    select_edu: "سطح تحصیلات را انتخاب کنید", edu_g12: "صنف ۱۲ / بکلوریا", edu_dip: "دیپلوم / فوق بکلوریا",
    edu_ba: "لیسانس", edu_ma: "ماستری", edu_phd: "دکتورا", edu_other: "سایر",
    doc_cv: "رزومه / سی‌وی", doc_edu: "اسناد تحصیلی", doc_id: "تذکره یا پاسپورت", doc_work: "نمونه‌های کاری",
    ph_name: "مثلاً احمد رحیمی", ph_phone: "مثلاً +93 770 123 456", ph_email: "مثلاً ahmad@example.com",
    ph_address: "آدرس کامل", ph_origin: "شهر / ولایت", ph_intro: "کمی درباره خود بنویسید…",
    ph_profile: "لینک پروفایل", ph_username: "@نام‌کاربری", ph_channel: "لینک چینل",
    ph_motivation: "انگیزه خود، آنچه شما را هیجان‌زده می‌کند و اینکه چرا مناسب هستید را بنویسید…",
    ph_field: "مثلاً علوم کامپیوتر", ph_institution: "نام دانشگاه / مکتب",
    e_job: "لطفاً یک بست را انتخاب کنید", e_name: "نام کامل الزامی است", e_phone: "شماره تماس الزامی است",
    e_email: "ایمیل الزامی است", e_dob: "تاریخ تولد الزامی است", e_address: "آدرس فعلی الزامی است",
    e_origin: "محل اصلی الزامی است", e_intro: "لطفاً خود را معرفی کنید", e_motivation: "انگیزه الزامی است",
    e_edu: "سطح تحصیلات الزامی است", e_field: "رشته تحصیلی الزامی است", e_institution: "نام موسسه الزامی است",
    e_required: "{x} الزامی است", file_too_large: "فایل بیش از حد بزرگ است", max_size: "حداکثر اندازه فایل ۱۰ مگابایت.",
    submit_failed: "ارسال ناموفق بود", went_wrong: "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
  },
};

const STEP_ICONS = [
  "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h4",
  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  "M12 14l9-5-9-5-9 5 9 5z",
  "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
];

const EDU_OPTS = [
  { value: "", key: "select_edu" },
  { value: "grade_12_baccalaureate", key: "edu_g12" },
  { value: "diploma_post_baccalaureate", key: "edu_dip" },
  { value: "bachelors_degree", key: "edu_ba" },
  { value: "masters_degree", key: "edu_ma" },
  { value: "doctorate", key: "edu_phd" },
  { value: "other", key: "edu_other" },
];

const DOC_TYPES = [
  { key: "cv_resume", labelKey: "doc_cv", required: true },
  { key: "educational_document", labelKey: "doc_edu", required: true },
  { key: "identity_document", labelKey: "doc_id", required: true },
  { key: "work_samples", labelKey: "doc_work", required: false },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";
const inpError = "w-full px-3.5 py-2.5 border border-red-400 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-red-50 outline-none transition-colors";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ icon, label, desc, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-teal-700">{desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

export default function PublicApplicationForm() {
  const [lang, setLang] = useState(() => localStorage.getItem("careersLang") || "en");
  const t = (k, vars) => {
    let s = (L[lang] && L[lang][k]) ?? L.en[k] ?? k;
    if (vars) Object.entries(vars).forEach(([kk, vv]) => { s = s.split(`{${kk}}`).join(vv); });
    return s;
  };
  const dir = lang === "en" ? "ltr" : "rtl";
  const font = lang === "en" ? undefined : RTL_FONT;
  const changeLang = (c) => { setLang(c); localStorage.setItem("careersLang", c); };

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState(null);
  const [jobPostings, setJobPostings] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    job_posting_id: "", full_name: "", contact_number: "", email: "", date_of_birth: "",
    current_address: "", place_of_origin: "", introduction: "", facebook: "", instagram: "",
    twitter_x: "", youtube: "", motivation: "", education_level: "", field_of_study: "",
    institution_name: "", total_experience_years: 0, unique_skill: [""],
  });
  const [workExperiences, setWorkExperiences] = useState([{ company_name: "", job_title: "", duration: "", responsibilities: "" }]);
  const [metRequirements, setMetRequirements] = useState([]);
  const [documents, setDocuments] = useState({ work_samples: null, identity_document: null, educational_document: null, cv_resume: null });

  const STEPS = STEP_ICONS.map((icon, i) => ({ num: i + 1, icon, label: t(`step${i + 1}`), desc: t(`step${i + 1}d`) }));
  const cur = STEPS.find((s) => s.num === step) || STEPS[0];
  const selectedJob = jobPostings.find((jp) => jp.id === parseInt(formData.job_posting_id)) || null;

  useEffect(() => {
    fetchJobPostings();
    const params = new URLSearchParams(window.location.search);
    const preselected = params.get("job");
    // A shared ?job= link lands straight on that posting's detail view.
    if (preselected) { setFormData((prev) => ({ ...prev, job_posting_id: preselected })); setStep(2); }
  }, []);

  const fetchJobPostings = async () => {
    setLoading(true);
    const __cached = peekCache("/public/recruitment/job-postings");
    if (__cached) {
      const __data = __cached?.data || [];
      setJobPostings(Array.isArray(__data) ? __data : []);
      setLoading(false);
    }
    try {
      const response = await get("/public/recruitment/job-postings");
      const data = response.data?.data || [];
      setJobPostings(Array.isArray(data) ? data : []);
    } catch (error) { console.error("Failed to fetch job postings", error); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "number" ? (value === "" ? 0 : parseInt(value)) : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };
  const handleSkillChange = (index, value) => { const n = [...formData.unique_skill]; n[index] = value; setFormData((p) => ({ ...p, unique_skill: n })); };
  const addSkill = () => setFormData((p) => ({ ...p, unique_skill: [...p.unique_skill, ""] }));
  const removeSkill = (index) => {
    if (formData.unique_skill.length === 1) { setFormData((p) => ({ ...p, unique_skill: [""] })); return; }
    setFormData((p) => ({ ...p, unique_skill: p.unique_skill.filter((_, i) => i !== index) }));
  };
  const handleWorkExperienceChange = (index, field, value) => { const n = [...workExperiences]; n[index][field] = value; setWorkExperiences(n); };
  const addWorkExperience = () => setWorkExperiences((p) => [...p, { company_name: "", job_title: "", duration: "", responsibilities: "" }]);
  const removeWorkExperience = (index) => {
    if (workExperiences.length === 1) { setWorkExperiences([{ company_name: "", job_title: "", duration: "", responsibilities: "" }]); return; }
    setWorkExperiences((p) => p.filter((_, i) => i !== index));
  };
  const handleFileChange = (e, docKey) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { Swal.fire(t("file_too_large"), t("max_size"), "error"); return; }
      setDocuments((p) => ({ ...p, [docKey]: file }));
    }
  };

  const validateStep = () => {
    const e = {};
    if ((step === 1 || step === 2) && !formData.job_posting_id) e.job_posting_id = t("e_job");
    if (step === 3) {
      if (!formData.full_name) e.full_name = t("e_name");
      if (!formData.contact_number) e.contact_number = t("e_phone");
      if (!formData.email) e.email = t("e_email");
      if (!formData.date_of_birth) e.date_of_birth = t("e_dob");
      if (!formData.current_address) e.current_address = t("e_address");
      if (!formData.place_of_origin) e.place_of_origin = t("e_origin");
      if (!formData.introduction) e.introduction = t("e_intro");
    }
    if (step === 5 && !formData.motivation) e.motivation = t("e_motivation");
    if (step === 6) {
      if (!formData.education_level) e.education_level = t("e_edu");
      if (!formData.field_of_study) e.field_of_study = t("e_field");
      if (!formData.institution_name) e.institution_name = t("e_institution");
    }
    if (step === 8) DOC_TYPES.forEach((d) => { if (d.required && !documents[d.key]) e[d.key] = t("e_required", { x: t(d.labelKey) }); });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canNext = () => {
    if (step === 1 || step === 2) return !!formData.job_posting_id;
    if (step === 3) return formData.full_name && formData.contact_number && formData.email && formData.date_of_birth && formData.current_address && formData.place_of_origin && formData.introduction;
    if (step === 5) return !!formData.motivation;
    if (step === 6) return formData.education_level && formData.field_of_study && formData.institution_name;
    return true;
  };
  const handleNext = () => { if (validateStep()) { setStep((s) => Math.min(s + 1, STEPS.length)); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true); setErrors({});
    try {
      const dataToSend = {
        ...formData,
        unique_skill: formData.unique_skill.filter((s) => s.trim() !== ""),
        met_requirements: metRequirements,
        work_experiences: workExperiences.filter((exp) => exp.company_name.trim() !== "" || exp.job_title.trim() !== ""),
        status: "received", source: "public_link",
      };
      const response = await post("/public/recruitment/applications", dataToSend);
      const applicationId = response.data?.data?.id;
      const docEntries = Object.entries(documents).filter(([, file]) => file !== null);
      if (docEntries.length > 0 && applicationId) {
        for (const [docType, file] of docEntries) {
          const fd = new FormData();
          fd.append("document_type", docType); fd.append("file", file); fd.append("application_id", applicationId);
          try { await post("/public/recruitment/application-documents", fd, { headers: { "Content-Type": "multipart/form-data" } }); }
          catch (e) { console.error(`Failed to upload ${docType}`, e); }
        }
      }
      setReferenceId(applicationId); setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const status = error.response?.status;
      if (status === 422 && error.response?.data?.errors) {
        const errs = error.response.data.errors; setErrors(errs);
        const stepMap = { 1: ["job_posting_id"], 3: ["full_name", "contact_number", "email", "date_of_birth", "current_address", "place_of_origin", "introduction"], 4: ["facebook", "instagram", "twitter_x", "youtube"], 5: ["motivation"], 6: ["education_level", "field_of_study", "institution_name"], 7: ["total_experience_years"] };
        const firstField = Object.keys(errs)[0];
        for (const [s, fields] of Object.entries(stepMap)) { if (fields.includes(firstField)) { setStep(Number(s)); break; } }
      } else { Swal.fire(t("submit_failed"), error.response?.data?.message || t("went_wrong"), "error"); }
    } finally { setSaving(false); }
  };

  const wrap = (children) => (
    <div dir={dir} style={{ fontFamily: font }} className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">{children}</div>
  );

  if (loading) {
    return wrap(
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-100 border-t-teal-600" />
          <span className="text-gray-500 text-sm">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return wrap(
      <>
        <PublicHeader t={t} lang={lang} changeLang={changeLang} />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-teal-600 to-cyan-600 px-8 py-12 text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-6">{t("received_title")}</h1>
              <p className="text-teal-50 text-sm mt-2">{t("thank_you")}</p>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-gray-700 text-sm leading-relaxed">{t("received_body")}</p>
              {referenceId && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">{t("reference_id")}</p>
                    <p className="text-lg font-bold text-teal-800">#{referenceId}</p>
                  </div>
                  <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
              )}
              <div className="pt-2 flex">
                <button onClick={() => window.location.reload()} className="flex-1 px-5 py-3 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors">{t("submit_another")}</button>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter t={t} />
      </>
    );
  }

  return wrap(
    <>
      <PublicHeader t={t} lang={lang} changeLang={changeLang} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9V7h2v6z" /></svg>
            {t("now_hiring")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4">{t("hero_title")}</h1>
          <p className="text-gray-600 mt-2 text-sm max-w-xl mx-auto">{t("hero_desc")}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s.num === step ? "bg-gradient-to-br from-teal-600 to-cyan-600 text-white ring-4 ring-teal-100 shadow-md" : s.num < step ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                    {s.num < step ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.num}
                  </div>
                  <span className={`text-[9px] font-medium mt-1 hidden sm:block ${s.num === step ? "text-teal-700" : s.num < step ? "text-teal-500" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 rounded-full ${s.num < step ? "bg-teal-300" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-gray-500 mt-3 sm:hidden">{t("step_of", { x: step, y: STEPS.length })} <span className="font-semibold text-teal-700">{cur.label}</span></p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); step === STEPS.length ? handleSubmit() : handleNext(); }}>
          {step === 1 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <JobPicker t={t} jobPostings={jobPostings} selectedId={formData.job_posting_id}
                onSelect={(id) => {
                  setFormData((p) => ({ ...p, job_posting_id: id }));
                  if (errors.job_posting_id) setErrors((p) => ({ ...p, job_posting_id: null }));
                  // Clicking a card opens its full detail view straight away.
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                error={errors.job_posting_id} />
            </StepCard>
          )}

          {step === 2 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <JobDetails t={t} dir={dir} job={selectedJob} onChangeJob={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
            </StepCard>
          )}

          {step === 3 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Label required>{t("full_name")}</Label><input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder={t("ph_name")} className={errors.full_name ? inpError : inp} />{errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}</div>
                <div><Label required>{t("contact_number")}</Label><input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} placeholder={t("ph_phone")} dir="ltr" className={errors.contact_number ? inpError : inp} />{errors.contact_number && <p className="text-red-500 text-xs mt-1">{errors.contact_number}</p>}</div>
                <div><Label required>{t("email")}</Label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder={t("ph_email")} dir="ltr" className={errors.email ? inpError : inp} />{errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}</div>
                <div><Label required>{t("dob")}</Label><DateField name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={errors.date_of_birth ? inpError : inp} />{errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}</div>
                <div className="sm:col-span-2"><Label required>{t("current_address")}</Label><input type="text" name="current_address" value={formData.current_address} onChange={handleChange} placeholder={t("ph_address")} className={errors.current_address ? inpError : inp} />{errors.current_address && <p className="text-red-500 text-xs mt-1">{errors.current_address}</p>}</div>
                <div className="sm:col-span-2"><Label required>{t("place_of_origin")}</Label><input type="text" name="place_of_origin" value={formData.place_of_origin} onChange={handleChange} placeholder={t("ph_origin")} className={errors.place_of_origin ? inpError : inp} />{errors.place_of_origin && <p className="text-red-500 text-xs mt-1">{errors.place_of_origin}</p>}</div>
                <div className="sm:col-span-2"><Label required>{t("introduction")}</Label><textarea name="introduction" value={formData.introduction} onChange={handleChange} rows={4} placeholder={t("ph_intro")} className={errors.introduction ? inpError : inp} />{errors.introduction && <p className="text-red-500 text-xs mt-1">{errors.introduction}</p>}</div>
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <p className="text-xs text-gray-500 -mt-2">{t("social_note")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Facebook</Label><input type="text" name="facebook" value={formData.facebook} onChange={handleChange} placeholder={t("ph_profile")} dir="ltr" className={inp} /></div>
                <div><Label>Instagram</Label><input type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder={t("ph_username")} dir="ltr" className={inp} /></div>
                <div><Label>Twitter / X</Label><input type="text" name="twitter_x" value={formData.twitter_x} onChange={handleChange} placeholder={t("ph_username")} dir="ltr" className={inp} /></div>
                <div><Label>YouTube</Label><input type="text" name="youtube" value={formData.youtube} onChange={handleChange} placeholder={t("ph_channel")} dir="ltr" className={inp} /></div>
              </div>
            </StepCard>
          )}

          {step === 5 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <div><Label required>{t("why_role")}</Label><textarea name="motivation" value={formData.motivation} onChange={handleChange} rows={6} placeholder={t("ph_motivation")} className={errors.motivation ? inpError : inp} />{errors.motivation && <p className="text-red-500 text-xs mt-1">{errors.motivation}</p>}</div>
              <div>
                <Label>{t("unique_skills")}</Label>
                <div className="space-y-2">
                  {formData.unique_skill.map((skill, index) => (
                    <div key={index} className="flex gap-2">
                      <input type="text" value={skill} onChange={(e) => handleSkillChange(index, e.target.value)} placeholder={t("skill_n", { n: index + 1 })} className={`${inp} flex-1`} />
                      <button type="button" onClick={() => removeSkill(index)} className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  ))}
                  <button type="button" onClick={addSkill} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>{t("add_skill")}</button>
                </div>
              </div>
            </StepCard>
          )}

          {step === 6 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label required>{t("education_level")}</Label><select name="education_level" value={formData.education_level} onChange={handleChange} className={errors.education_level ? inpError : inp}>{EDU_OPTS.map((o) => <option key={o.value} value={o.value}>{t(o.key)}</option>)}</select>{errors.education_level && <p className="text-red-500 text-xs mt-1">{errors.education_level}</p>}</div>
                <div><Label required>{t("field_of_study")}</Label><input type="text" name="field_of_study" value={formData.field_of_study} onChange={handleChange} placeholder={t("ph_field")} className={errors.field_of_study ? inpError : inp} />{errors.field_of_study && <p className="text-red-500 text-xs mt-1">{errors.field_of_study}</p>}</div>
                <div><Label required>{t("institution")}</Label><input type="text" name="institution_name" value={formData.institution_name} onChange={handleChange} placeholder={t("ph_institution")} className={errors.institution_name ? inpError : inp} />{errors.institution_name && <p className="text-red-500 text-xs mt-1">{errors.institution_name}</p>}</div>
                <div><Label>{t("total_exp")}</Label><input type="number" name="total_experience_years" value={formData.total_experience_years} onChange={handleChange} min={0} dir="ltr" className={inp} /></div>
              </div>
            </StepCard>
          )}

          {step === 7 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <div className="space-y-4">
                {workExperiences.map((exp, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">{t("experience_n", { n: index + 1 })}</span>
                      <button type="button" onClick={() => removeWorkExperience(index)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={exp.company_name} onChange={(e) => handleWorkExperienceChange(index, "company_name", e.target.value)} placeholder={t("company")} className={inp} />
                      <input type="text" value={exp.job_title} onChange={(e) => handleWorkExperienceChange(index, "job_title", e.target.value)} placeholder={t("job_title")} className={inp} />
                      <input type="text" value={exp.duration} onChange={(e) => handleWorkExperienceChange(index, "duration", e.target.value)} placeholder={t("duration")} className={inp} />
                    </div>
                    <textarea value={exp.responsibilities} onChange={(e) => handleWorkExperienceChange(index, "responsibilities", e.target.value)} placeholder={t("responsibilities")} rows={2} className={inp} />
                  </div>
                ))}
                <button type="button" onClick={addWorkExperience} className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-teal-400 hover:text-teal-600 transition-colors text-sm font-medium">{t("add_experience")}</button>

                {(() => {
                  const selected = selectedJob;
                  if (!selected || !selected.requirements || selected.requirements.length === 0) return null;
                  const toggleReq = (req) => setMetRequirements((prev) => prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]);
                  return (
                    <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <p className="text-xs font-bold text-gray-800">{t("job_requirements")}</p>
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] text-gray-500 mb-3">{t("req_note")}</p>
                        <div className="space-y-1.5">
                          {selected.requirements.map((req, i) => {
                            const checked = metRequirements.includes(req);
                            return (
                              <button key={i} type="button" onClick={() => toggleReq(req)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${checked ? "bg-teal-50 border-teal-200" : "bg-white border-gray-200 hover:border-teal-300"}`}>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-teal-600 border-teal-600" : "border-gray-300"}`}>{checked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                                <span className={`text-xs ${checked ? "text-teal-700 font-medium" : "text-gray-700"}`}>{req}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </StepCard>
          )}

          {step === 8 && (
            <StepCard icon={cur.icon} label={cur.label} desc={cur.desc}>
              <div className="space-y-3">
                {DOC_TYPES.map((doc) => (
                  <div key={doc.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${documents[doc.key] ? "bg-teal-50/50 border-teal-200" : errors[doc.key] ? "bg-red-50 border-red-200" : "border-gray-200 hover:border-teal-200"}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${documents[doc.key] ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"}`}>
                      {documents[doc.key] ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{t(doc.labelKey)} {doc.required && <span className="text-red-400">*</span>}</p>
                      {documents[doc.key] ? <p className="text-[10px] text-teal-600 font-medium truncate">{documents[doc.key].name}</p> : <p className="text-[10px] text-gray-400">{t("max_file")}</p>}
                      {errors[doc.key] && !documents[doc.key] && <p className="text-red-500 text-[10px] mt-0.5">{errors[doc.key]}</p>}
                    </div>
                    <label className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all flex-shrink-0">{documents[doc.key] ? t("change") : t("upload")}<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, doc.key)} className="hidden" /></label>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5 mt-4">
                <p className="text-xs font-bold text-gray-700">{t("review")}</p>
                {[
                  { label: t("s_job"), value: selectedJob?.title || "—" },
                  { label: t("s_applicant"), value: formData.full_name || "—" },
                  { label: t("s_email"), value: formData.email || "—" },
                  { label: t("s_contact"), value: formData.contact_number || "—" },
                  { label: t("s_education"), value: t(EDU_OPTS.find((e) => e.value === formData.education_level)?.key || "edu_other") },
                  { label: t("s_experience"), value: t("years", { n: formData.total_experience_years || 0 }) },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={() => step > 1 && setStep((s) => s - 1)} disabled={step === 1} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <svg className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {t("back")}
            </button>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-1">{STEPS.map((s) => <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />)}</div>
              {step < STEPS.length ? (
                <button type="button" disabled={!canNext()} onClick={handleNext} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                  {step === 2 ? t("jd_apply") : t("continue")}
                  <svg className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-sm">
                  {saving ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t("submitting")}</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t("submit")}</>}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
      <PublicFooter t={t} />
    </>
  );
}

function LangSwitch({ lang, changeLang }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5" dir="ltr">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => changeLang(l.code)} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${lang === l.code ? "bg-teal-600 text-white" : "text-gray-600 hover:text-gray-800"}`}>{l.label}</button>
      ))}
    </div>
  );
}

function JobPicker({ t, jobPostings, selectedId, onSelect, error }) {
  const [query, setQuery] = useState("");
  if (jobPostings.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" /></svg></div>
        <p className="text-sm font-semibold text-gray-700 mt-4">{t("no_positions")}</p>
        <p className="text-xs text-gray-500 mt-1">{t("check_back")}</p>
      </div>
    );
  }
  const q = query.trim().toLowerCase();
  const filtered = q ? jobPostings.filter((jp) => [jp.title, jp.location, jp.position_title, jp.department, jp.employment_type].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))) : jobPostings;
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{t(jobPostings.length === 1 ? "open_position" : "open_positions", { n: jobPostings.length })}</p>
          <p className="text-xs text-gray-500">{t("choose_role")}</p>
        </div>
        {jobPostings.length > 3 && (
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search_positions")} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
          </div>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">{t("no_match", { q: query })}</p>
          <button type="button" onClick={() => setQuery("")} className="text-xs text-teal-600 font-medium mt-1 hover:underline">{t("clear_search")}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filtered.map((jp) => <JobCard key={jp.id} t={t} job={jp} selected={parseInt(selectedId) === jp.id} onClick={() => onSelect(jp.id)} />)}</div>
      )}
      {error && <p className="text-red-500 text-xs flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
    </div>
  );
}

/* Deadline countdown shared by the job card and the job detail view. */
function deadlineInfo(job, t) {
  if (!job?.deadline_date) return { label: null, urgent: false, closed: false, date: null };
  const d = new Date(job.deadline_date);
  if (isNaN(d.getTime())) return { label: null, urgent: false, closed: false, date: null };
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (days < 0) return { label: t("closed"), urgent: true, closed: true, date };
  if (days === 0) return { label: t("closes_today"), urgent: true, closed: false, date };
  if (days <= 7) return { label: days === 1 ? t("day_left") : t("days_left", { n: days }), urgent: true, closed: false, date };
  return { label: t("closes_on", { d: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) }), urgent: false, closed: false, date };
}

function JobCard({ t, job, selected, onClick }) {
  const dept = job.department?.replace(/_/g, " ");
  const empType = job.employment_type?.replace(/_/g, " ");
  const { label: deadlineLabel, urgent: deadlineUrgent } = deadlineInfo(job, t);
  return (
    <button type="button" onClick={onClick} className={`group relative text-left rounded-2xl border-2 bg-white overflow-hidden transition-all hover:shadow-md ${selected ? "border-teal-500 ring-4 ring-teal-100 shadow-md" : "border-gray-200 hover:border-teal-300"}`}>
      {selected && <div className="absolute top-3 right-3 w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center shadow-md z-10"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
      <div className={`h-1.5 ${selected ? "bg-gradient-to-r from-teal-500 to-cyan-500" : "bg-gray-100 group-hover:bg-teal-200"}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-gradient-to-br from-teal-600 to-cyan-600 text-white" : "bg-teal-50 text-teal-600 group-hover:bg-teal-100"}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 leading-tight pr-8">{job.title}</p>{job.position_title && job.position_title !== job.title && <p className="text-xs text-gray-500 mt-0.5 truncate">{job.position_title}</p>}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {dept && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-[10px] font-semibold capitalize">{dept}</span>}
          {empType && <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold capitalize">{empType}</span>}
          {job.location && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md text-[10px] font-semibold">{job.location}</span>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {job.number_of_positions ? <span>{t("n_open", { n: job.number_of_positions })}</span> : null}
            {job.experience_years ? <span>{t("n_yrs", { n: job.experience_years })}</span> : null}
          </div>
          {deadlineLabel && <span className={`text-[11px] font-semibold ${deadlineUrgent ? "text-red-600" : "text-gray-500"}`}>{deadlineLabel}</span>}
        </div>
      </div>
    </button>
  );
}

const FACT_ICON = {
  department: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  employment: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  location: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  positions: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  experience: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  reporting: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  deadline: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  posted: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  title: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
};

/* Every fact stays on screen even when the posting left it blank, so the
 * overview reads as a complete spec sheet rather than a patchy list. */
function Fact({ t, icon, label, value, capitalize }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-start gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${empty ? "bg-gray-100 text-gray-400" : "bg-teal-50 text-teal-600"}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} /></svg>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        {empty
          ? <p className="text-xs text-gray-400 italic">{t("jd_not_specified")}</p>
          : <p className={`text-xs font-semibold text-gray-800 break-words ${capitalize ? "capitalize" : ""}`}>{value}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">{children}</p>
    </div>
  );
}

/* Full read-only view of the picked job posting — shown between "Position" and
 * "About You" so the applicant knows exactly what they're applying to. */
function JobDetails({ t, dir, job, onChangeJob }) {
  if (!job) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={FACT_ICON.title} /></svg>
        </div>
        <p className="text-sm text-gray-600 mt-4">{t("jd_none")}</p>
        <button type="button" onClick={onChangeJob} className="mt-3 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors">{t("jd_change")}</button>
      </div>
    );
  }

  const dl = deadlineInfo(job, t);
  const dept = job.department?.replace(/_/g, " ");
  const empType = job.employment_type?.replace(/_/g, " ");
  const requirements = Array.isArray(job.requirements) ? job.requirements.filter((r) => String(r).trim() !== "") : [];
  // Both description sources, blanks dropped and identical text shown once.
  const descriptions = [...new Set([job.description, job.position_description].map((d) => (d || "").trim()).filter(Boolean))];
  const fmtDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-5">
      {/* Title banner */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 px-5 py-5 text-white">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={FACT_ICON.title} /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-snug">{job.title}</h2>
            {job.position_title && job.position_title !== job.title && <p className="text-teal-50 text-xs mt-0.5">{job.position_title}</p>}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {dept && <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold capitalize">{dept}</span>}
              {empType && <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold capitalize">{empType}</span>}
              {job.location && <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-semibold">{job.location}</span>}
              {dl.label && <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${dl.urgent ? "bg-red-500 text-white" : "bg-white/20"}`}>{dl.label}</span>}
            </div>
          </div>
        </div>
      </div>

      {dl.closed && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <p className="text-xs text-red-700 font-medium">{t("jd_closed")}</p>
        </div>
      )}

      {/* Overview facts */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <SectionTitle icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">{t("jd_overview")}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fact t={t} icon={FACT_ICON.title} label={t("jd_position_title")} value={job.position_title || job.position_title_native} />
          <Fact t={t} icon={FACT_ICON.department} label={t("jd_department")} value={dept} capitalize />
          <Fact t={t} icon={FACT_ICON.employment} label={t("jd_employment")} value={empType} capitalize />
          <Fact t={t} icon={FACT_ICON.location} label={t("jd_location")} value={job.location} />
          <Fact t={t} icon={FACT_ICON.positions} label={t("jd_positions")} value={job.number_of_positions ? t("jd_n_positions", { n: job.number_of_positions }) : null} />
          <Fact t={t} icon={FACT_ICON.experience} label={t("jd_experience")} value={job.experience_years ? t("jd_min_yrs", { n: job.experience_years }) : null} />
          <Fact t={t} icon={FACT_ICON.reporting} label={t("jd_reporting")} value={job.reporting_to} />
          <Fact t={t} icon={FACT_ICON.deadline} label={t("jd_deadline")} value={dl.date} />
          <Fact t={t} icon={FACT_ICON.posted} label={t("jd_posted")} value={fmtDate(job.posted_at)} />
        </div>
      </div>

      {/* Description — the posting's own text plus the position title's, since
        * either or both may be filled in by the recruitment team. */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <SectionTitle icon="M4 6h16M4 12h16M4 18h7">{t("jd_description")}</SectionTitle>
        {descriptions.length > 0 ? (
          <div className="space-y-3">
            {descriptions.map((d, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{d}</p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">{t("jd_no_desc")}</p>
        )}
      </div>

      {/* Requirements */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <SectionTitle icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">{t("jd_requirements")}</SectionTitle>
        {requirements.length > 0 ? (
          <ul className="space-y-2">
            {requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 italic">{t("jd_no_req")}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        <p className="text-xs text-gray-500">{t("jd_note")}</p>
        <button type="button" onClick={onChangeJob} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors flex-shrink-0">
          <svg className={`w-3.5 h-3.5 ${dir === "rtl" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          {t("jd_change")}
        </button>
      </div>
    </div>
  );
}

function PublicHeader({ t, lang, changeLang }) {
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg></div>
          <div><p className="text-sm font-bold text-gray-900">Wifaq Educational Network</p><p className="text-[11px] text-gray-500">{t("portal")}</p></div>
        </div>
        <LangSwitch lang={lang} changeLang={changeLang} />
      </div>
    </header>
  );
}

function PublicFooter({ t }) {
  return (
    <footer className="mt-12 border-t border-gray-100 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500">{t("rights", { y: new Date().getFullYear() })}</p>
        <p className="text-[11px] text-gray-400">{t("confidential")}</p>
      </div>
    </footer>
  );
}
