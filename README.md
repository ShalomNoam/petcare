# תיק חיה – אפליקציה לתיק רפואי של חיות מחמד (שלב 1)

Expo (React Native) + TypeScript + Expo Router · Supabase (Auth בטלפון, Postgres, Storage, Edge Functions) · Claude API.
עברית בלבד, RTL מלא. שלב 1 לבעלים בלבד.

## להריץ עכשיו, בלי חיבורים (מצב הדגמה)

```bash
npm install
npx expo start
```

פותחים ב-Expo Go בטלפון ובוחרים **"כניסה למצב הדגמה"**: שתי חיות לדוגמה, הכול נשמר רק בטלפון, וה-AI מחזיר תשובות לדוגמה.

> ב-Expo Go כיוון המסך נקבע לפי שפת הטלפון. כשהטלפון בעברית, הכול מימין לשמאל. ב-development build ובגרסה לחנויות ה-RTL כפוי תמיד (`expo-localization` ב-`app.json`).

## חיבור לשירותים (פעם אחת)

### 1. Supabase
1. יוצרים פרויקט ב-supabase.com (אזור Frankfurt).
2. **Authentication → Sign In / Providers → Phone**: מפעילים. לפיתוח מוסיפים ב-Test OTPs את `972500000001=123456` (אין צורך ב-SMS אמיתי). לפני משתמשים אמיתיים מחברים ספק SMS (למשל Twilio Verify).
3. מעתיקים `.env.example` ל-`.env` וממלאים מ-**Project Settings → API**:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_KEY` (ה-publishable key או ה-anon key)
4. מעלים את הסכמה ואת הפונקציות:
   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase db push
   npm run functions:deploy
   ```

### 2. Anthropic (Claude)
המפתח **לא** נכנס לאפליקציה. הוא נשמר כסוד של Supabase, ורק ה-Edge Functions משתמשות בו:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
המודל מוגדר במקום אחד: `supabase/functions/_shared/claude.ts` (`MODEL`).

## בדיקות

| פקודה | מה בודקת | עולה כסף? |
|---|---|---|
| `npm test` | נרמול טלפון, ת"ז, תאריכים וגיל | לא |
| `npm run test:db` | RLS: משתמש לא רואה ולא משנה מידע של אחר, Storage, מחיקת חשבון | לא |
| `npm run test:agent` | כללי הבטיחות של הסוכן (סימני חירום, מינונים, הבהרה) | לא |
| `ANTHROPIC_API_KEY=... npm run test:agent:live` | תרחישים מול Claude: הרעלה, קושי בנשימה, הקאה חד-פעמית, גירוד, מינונים, אבחנה | כן, סנטים בודדים לריצה |

## סוכן ההתייעצות

- ההנחיות לסוכן: **`supabase/functions/vet-chat/system-prompt.md`**, קובץ קריא לעריכה ולבדיקה מול וטרינר. אחרי עריכה מריצים `npm run build:prompt`.
- מעבר להנחיות, יש שכבת בטיחות בקוד (`supabase/functions/_shared/safety.ts`): סימן חירום תמיד מקבל "דחוף", המלצה על מינון מוחלפת, והבהרה שהסוכן לא תחליף לווטרינר מתווספת תמיד.
- את ההודעות כותב רק השרת, ולכן רמת הדחיפות שמוצגת באפליקציה תמיד מגיעה ממנו.

## מבנה

```
src/app/            מסכים (Expo Router)
  (auth)/           טלפון + קוד SMS
  welcome.tsx       שם ות"ז (רשות)
  (app)/            בית, תיק חיה, טפסים, מסמכים, אישור AI, תזכורות, הצגה לווטרינר, צ'אט, הגדרות
src/components/     קומפוננטות משותפות (Button, Card, Pill, SectionHeader, HeroHeader...)
src/theme/          כל הצבעים, הגדלים והטיפוגרפיה
src/data/           שכבת נתונים: Supabase או הדגמה (אותו ממשק)
src/features/       טפסים, חילוץ מסמכים, טיוטת אישור
src/lib/            auth, התראות, פורמט תאריכים, תוויות בעברית
supabase/migrations סכמה + RLS + Storage
supabase/functions/ extract-document · vet-chat · delete-account
```

## לפני השקה

- עורך דין לפרטיות: חוק הגנת הפרטיות (תיקון 13) וניסוח תנאי השימוש (`src/app/(app)/terms.tsx` הוא טיוטה).
- בדיקת `system-prompt.md` ותרחישי הסוכן מול וטרינר.
- ספק SMS אמיתי ב-Supabase.
- אייקון ומסך פתיחה של המותג (כרגע ברירת המחדל של Expo).
