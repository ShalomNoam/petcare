/**
 * Terms of use & privacy – DRAFT. Per the spec, the final text must be
 * reviewed by a privacy lawyer (חוק הגנת הפרטיות, תיקון 13) before launch.
 */
import { StyleSheet } from 'react-native';

import { AppText, Card, HeroHeader, Pill, Screen, SectionHeader } from '@/components';
import { goBack } from '@/lib/nav';
import { space } from '@/theme';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'מה האפליקציה עושה',
    body: [
      'תיק חיה עוזרת לך לשמור ולסדר את המידע הרפואי של חיות המחמד שלך, לקבל תזכורות ולהציג תקציר לווטרינר.',
      'האפליקציה אינה שירות רפואי. המידע בה אינו תחליף לבדיקה, לאבחנה או לטיפול של וטרינר.',
    ],
  },
  {
    title: 'סוכן ההתייעצות',
    body: [
      'הסוכן הוא כלי עזר דיגיטלי מבוסס בינה מלאכותית. הוא עוזר להחליט אם ומתי לפנות לווטרינר, ואינו נותן אבחנה או המלצה על תרופות.',
      'תשובות הסוכן עלולות לטעות. במצב חירום, או בכל ספק, יש לפנות מיד לווטרינר או למיון וטרינרי.',
    ],
  },
  {
    title: 'קריאת מסמכים',
    body: [
      'מסמכים שמעלים נשלחים לעיבוד אוטומטי כדי לחלץ מהם פרטים. שום פרט לא נכנס לתיק בלי אישור שלך, והמסמך המקורי נשמר תמיד.',
      'כדאי לבדוק כל פרט שזוהה מול המסמך לפני האישור.',
    ],
  },
  {
    title: 'המידע שלך',
    body: [
      'המידע שייך לך. רק את/ה רואה את התיק. אף וטרינר או גורם אחר לא מקבל גישה לתיק בלי אישור שלך.',
      'המידע נשמר בשרתים מאובטחים, וכל משתמש יכול לגשת רק למידע שלו.',
      'אפשר למחוק את החשבון ואת כל המידע, כולל הקבצים, בכל רגע מתוך ההגדרות.',
    ],
  },
];

export default function Terms() {
  return (
    <Screen header={<HeroHeader onBack={goBack} title="תנאי שימוש ופרטיות" />}>
      <Pill label="טיוטה · לבדיקת עורך דין לפני השקה" tone="sun" />
      {SECTIONS.map((s, i) => (
        <Card key={s.title} size="xl" style={styles.card}>
          <SectionHeader number={i + 1} title={s.title} />
          {s.body.map((p) => (
            <AppText key={p}>{p}</AppText>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: space.s1 } });
