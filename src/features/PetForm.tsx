import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ChoiceChips, DateField, PetAvatar, Pill, TextField } from '@/components';
import type { Pet, Sex, Species } from '@/data';
import { options, sexOptions, speciesLabel } from '@/lib/labels';
import { sizes, space } from '@/theme';

import { pickImage, type PickedFile } from './pickers';

export type PetFormValues = {
  name: string;
  species: Species | null;
  breed: string;
  sex: Sex | null;
  birth_date: string | null;
  chip_number: string;
  neutered: boolean | null;
  photo: PickedFile | null;
};

type Props = {
  initial?: Pet;
  submitLabel: string;
  onSubmit: (values: PetFormValues) => Promise<void>;
};

const neuteredOptions = [
  { value: 'yes', label: 'כן' },
  { value: 'no', label: 'לא' },
  { value: 'unknown', label: 'לא ידוע' },
];

/** Add / edit pet details. Required: name, species, sex, birth date, photo. */
export function PetForm({ initial, submitLabel, onSubmit }: Props) {
  const [v, setV] = useState<PetFormValues>({
    name: initial?.name ?? '',
    species: initial?.species ?? null,
    breed: initial?.breed ?? '',
    sex: initial?.sex ?? null,
    birth_date: initial?.birth_date ?? null,
    chip_number: initial?.chip_number ?? '',
    neutered: initial?.neutered ?? null,
    photo: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PetFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const set = <K extends keyof PetFormValues>(k: K, val: PetFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function choosePhoto(from: 'camera' | 'library') {
    const photo = await pickImage(from, { square: true });
    if (photo) set('photo', photo);
  }

  async function submit() {
    const e: typeof errors = {};
    if (!v.name.trim()) e.name = 'מה השם?';
    if (!v.species) e.species = 'בחר סוג';
    if (!v.sex) e.sex = 'בחר מין';
    if (!v.birth_date) e.birth_date = 'תאריך לידה (גם משוער) עוזר לחשב גיל';
    else if (v.birth_date > new Date().toISOString().slice(0, 10)) e.birth_date = 'תאריך בעתיד';
    if (!v.photo && !initial?.photo_path) e.photo = 'צריך תמונה, כדי שהווטרינר יזהה את החיה';
    if (v.chip_number && !/^\d{9,15}$/.test(v.chip_number)) e.chip_number = 'מספר שבב הוא 15 ספרות';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({ ...v, name: v.name.trim(), breed: v.breed.trim() });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'השמירה נכשלה');
      setSaving(false);
    }
  }

  const preview = { name: v.name || 'חיה', species: v.species ?? 'other', photo_path: initial?.photo_path ?? null };

  return (
    <>
      <Card size="xl" style={styles.card}>
        <View style={styles.photoRow}>
          <PetAvatar pet={preview} localUri={v.photo?.uri} size={sizes.avatarLarge} />
          <View style={styles.photoActions}>
            <View style={styles.labelRow}>
              <AppText variant="label">תמונה</AppText>
              <Pill label="חובה" tone="sun" />
            </View>
            <Button label="צילום" variant="secondary" icon="camera-outline" onPress={() => choosePhoto('camera')} />
            <Button label="מהגלריה" variant="ghost" icon="images-outline" onPress={() => choosePhoto('library')} />
          </View>
        </View>
        {errors.photo && (
          <AppText variant="small" tone="danger">
            {errors.photo}
          </AppText>
        )}

        <TextField label="שם" value={v.name} onChangeText={(t) => set('name', t)} error={errors.name} maxLength={60} placeholder="למשל: רקסי" />
        <ChoiceChips label="סוג" options={options(speciesLabel)} value={v.species} onChange={(x) => set('species', x)} error={errors.species} />
        <TextField label="גזע" optional value={v.breed} onChangeText={(t) => set('breed', t)} maxLength={80} placeholder="למשל: מעורב" />
        <ChoiceChips label="מין" options={sexOptions} value={v.sex} onChange={(x) => set('sex', x)} error={errors.sex} />
        <DateField label="תאריך לידה" value={v.birth_date} onChange={(x) => set('birth_date', x)} hint="אם לא ידוע בדיוק, תאריך משוער" error={errors.birth_date} />
      </Card>

      <Card size="xl" style={styles.card}>
        <AppText variant="h3">זיהוי</AppText>
        <TextField
          label="מספר שבב"
          optional
          ltr
          keyboardType="number-pad"
          value={v.chip_number}
          onChangeText={(t) => set('chip_number', t.replace(/\D/g, ''))}
          maxLength={15}
          error={errors.chip_number}
        />
        <ChoiceChips
          label="מעוקר / מסורס"
          optional
          options={neuteredOptions}
          value={v.neutered === null ? 'unknown' : v.neutered ? 'yes' : 'no'}
          onChange={(x) => set('neutered', x === 'unknown' ? null : x === 'yes')}
        />
      </Card>

      {saveError && (
        <AppText variant="small" tone="danger">
          {saveError}
        </AppText>
      )}
      <Button label={submitLabel} withArrow loading={saving} onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.s3 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  photoActions: { flex: 1, gap: space.s1, alignItems: 'flex-start' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
});
