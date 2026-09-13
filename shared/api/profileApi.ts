import { getSupabaseClient } from '../../lib/supabase';

export const PROFILE_AVATAR_BUCKET = 'profile-avatars';

const PROFILE_AVATAR_PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${PROFILE_AVATAR_BUCKET}/`;

const PROFILE_AVATAR_OBJECT_NAME = 'avatar';

const PROFILE_AVATAR_CACHE_CONTROL = '0';

const getProfileAvatarObjectPath = (userId: string) =>
    `${userId}/${PROFILE_AVATAR_OBJECT_NAME}`;

export const resolveStoredProfileAvatarPath = (avatarPath?: string | null) => {
    if (!avatarPath) {
        return null;
    }

    if (!avatarPath.includes('://')) {
        return avatarPath;
    }

    try {
        const { pathname } = new URL(avatarPath);
        if (!pathname.startsWith(PROFILE_AVATAR_PUBLIC_PATH_PREFIX)) {
            return null;
        }

        return decodeURIComponent(pathname.slice(PROFILE_AVATAR_PUBLIC_PATH_PREFIX.length));
    } catch {
        return null;
    }
};

export async function updateProfile(
        userId: string,
        profilePatch: { username?: string; avatar_path?: string | null }
    ) {
        const { error } = await getSupabaseClient()
            .from('profiles')
            .upsert({ id: userId, ...profilePatch });
        if (error) throw error;
    }

export function getProfileAvatarPublicUrl(objectPath: string, version?: number) {
        const { data } = getSupabaseClient()
            .storage
            .from(PROFILE_AVATAR_BUCKET)
            .getPublicUrl(objectPath);

        return typeof version === 'number'
            ? `${data.publicUrl}?v=${version}`
            : data.publicUrl;
    }

export async function uploadProfileAvatar(userId: string, file: File) {
        const objectPath = getProfileAvatarObjectPath(userId);
        const avatarStorage = getSupabaseClient()
            .storage
            .from(PROFILE_AVATAR_BUCKET);

        const { error } = await avatarStorage.upload(objectPath, file, {
            upsert: true,
            contentType: file.type || undefined,
            cacheControl: PROFILE_AVATAR_CACHE_CONTROL,
        });

        if (error) throw error;

        return objectPath;
    }
