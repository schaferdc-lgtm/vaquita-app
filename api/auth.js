import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { token, user } = req.body;

  if (!token || !user) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    // Sincroniza los datos del usuario directamente en tu base de datos de Supabase
    const { data, error } = await supabase
      .from('usuarios')
      .upsert({
        email: user.email,
        nombre: user.name,
        actualizado_en: new Date()
      });

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}