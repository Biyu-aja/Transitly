import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadImageToSupabase = async (file: File): Promise<string> => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials map required in .env.local');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error } = await supabase.storage
        .from('img')
        .upload(filePath, file);

    if (error) {
        throw error;
    }

    const { data: publicUrlData } = supabase.storage
        .from('img')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
};
