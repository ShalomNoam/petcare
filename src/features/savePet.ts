import { db, type Pet } from '@/data';
import { storagePath } from '@/data/files';

import type { PetFormValues } from './PetForm';

function fields(v: PetFormValues) {
  return {
    name: v.name,
    species: v.species!,
    breed: v.breed || null,
    sex: v.sex!,
    birth_date: v.birth_date,
    chip_number: v.chip_number || null,
    neutered: v.neutered,
  };
}

async function uploadPhoto(userId: string, petId: string, v: PetFormValues): Promise<string | null> {
  if (!v.photo) return null;
  const path = storagePath(userId, petId, v.photo.mimeType);
  await db().uploadFile(path, v.photo.uri, v.photo.mimeType);
  return path;
}

export async function createPet(userId: string, v: PetFormValues): Promise<Pet> {
  const pet = await db().insertPet(fields(v));
  const photo_path = await uploadPhoto(userId, pet.id, v);
  if (photo_path) await db().updatePet(pet.id, { photo_path });
  return { ...pet, photo_path };
}

export async function updatePet(userId: string, pet: Pet, v: PetFormValues) {
  const photo_path = await uploadPhoto(userId, pet.id, v);
  await db().updatePet(pet.id, { ...fields(v), ...(photo_path ? { photo_path } : {}) });
  if (photo_path && pet.photo_path) await db().removeFiles([pet.photo_path]);
}
