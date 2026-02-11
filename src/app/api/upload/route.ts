import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { getSafeErrorMessage, logApiError } from '@/lib/api-error';

/** Dossier des uploads : public/uploads. Surcharge : UPLOADS_DIR. Si nginx : proxy_request_buffering off; client_max_body_size 500m; */
function getUploadsDir(): string {
  const envDir = process.env.UPLOADS_DIR;
  if (envDir) return envDir;
  return join(process.cwd(), 'public', 'uploads');
}
import sharp from 'sharp';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

// Configuration pour Next.js App Router
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes pour les gros fichiers
export const runtime = 'nodejs'; // Force Node.js (pas Edge) pour le streaming des gros fichiers

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Tous les admins du bot ont les mêmes droits (upload, etc.)
    if (!(await checkAdminAccess(req))) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé. Droits administrateur requis.' },
        { status: 401 }
      );
    }

    // Variable déjà déclarée plus haut
    // const contentType = req.headers.get('content-type') || '';
    let filename = '';
    let fileBuffer: Buffer | null = null;
    let fileStream: Readable | null = null;
    let mimeType = '';
    let size = 0;

    // --- MODE STREAMING DIRECT (Pour les gros fichiers/vidéos) ---
    // Si le client envoie "application/octet-stream" ou un type vidéo avec un header x-file-name
    
    const url = new URL(req.url);
    const queryFilename = url.searchParams.get('filename');
    const xFileName = req.headers.get('x-file-name') || queryFilename;

    if (xFileName || !contentType.includes('multipart/form-data')) {
      if (!xFileName) {
         // Fallback impossible sans nom de fichier
         return NextResponse.json({ success: false, message: 'Nom de fichier manquant (Header x-file-name ou param ?filename=)' }, { status: 400 });
      }
      
      const rawFilename = xFileName;
      
      // Décodage du nom de fichier (support UTF-8)
      try {
        filename = decodeURIComponent(rawFilename);
      } catch {
        filename = rawFilename;
      }
      
      mimeType = req.headers.get('content-type') || 'application/octet-stream';
      size = Number(req.headers.get('content-length') || 0);

      if (!req.body) {
         return NextResponse.json({ success: false, message: 'Corps de requête vide' }, { status: 400 });
      }

      // Conversion du Web Stream (req.body) en Node Stream pour l'écriture fichier
      // @ts-ignore
      fileStream = Readable.fromWeb(req.body);
    } 
    // --- MODE STANDARD (FormData pour les petites images) ---
    else {
      try {
        const data = await req.formData();
        const file: File | null = data.get('file') as unknown as File;
        
        if (!file) {
          return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
        }
        
        filename = file.name;
        mimeType = file.type;
        size = file.size;
        
        // Pour les images standard, on charge en buffer pour Sharp
        // Pour le reste, on essaie de streamer si possible
        if (file.type.startsWith('image/') && !file.type.includes('svg') && !file.type.includes('gif')) {
           const bytes = await file.arrayBuffer();
           fileBuffer = Buffer.from(bytes);
        } else {
           // @ts-ignore
           const webStream = file.stream ? file.stream() : null;
           if (webStream) {
             // @ts-ignore
             fileStream = Readable.fromWeb(webStream);
           } else {
             const bytes = await file.arrayBuffer();
             fileBuffer = Buffer.from(bytes);
           }
        }
      } catch (e) {
        console.error("Erreur parsing FormData:", e);
        return NextResponse.json({ 
          success: false, 
          message: 'Erreur lors de la lecture du fichier. Pour les gros fichiers, le mode stream est requis.' 
        }, { status: 413 });
      }
    }

    // 3. Validation Extension
    const fileExtension = filename.toLowerCase().split('.').pop() || '';
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'm4v', '3gp', '3g2', 'avi', 'mpeg', 'mpg'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'];
    
    const isVideo = mimeType.startsWith('video/') || videoExtensions.includes(fileExtension);
    const isImage = mimeType.startsWith('image/') || imageExtensions.includes(fileExtension);
    
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { success: false, message: 'Type de fichier non supporté.' },
        { status: 400 }
      );
    }

    // 4. Sanitisation nom fichier (anti path traversal)
    const baseName = filename.split(/[/\\]/).pop() || 'file';
    const ext = baseName.includes('.') ? '.' + baseName.split('.').pop()!.toLowerCase() : '';
    const namePart = baseName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
    const cleanFilename = `${Date.now()}-${namePart}${ext}`;

    // 6. Préparation sauvegarde
    const uploadDir = getUploadsDir();
    await mkdir(uploadDir, { recursive: true });

    // 5. Traitement Image (Seulement si Buffer disponible, donc via FormData ou petit fichier)
    if (fileBuffer && isImage && !mimeType.includes('svg') && !mimeType.includes('gif')) {
      try {
        const webpName = cleanFilename.replace(/\.[^/.]+$/, "") + ".webp";
        const path = join(uploadDir, webpName);
        
        await sharp(fileBuffer)
          .rotate()
          .resize(1920, 1920, { 
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(path);
        
        return NextResponse.json({ 
          success: true, 
          url: `/api/uploads/${webpName}`,
          fileName: webpName,
          type: 'image/webp',
          size: size, 
        });
      } catch (err) {
        console.error('Sharp error, fallback to raw save:', err);
      }
    }

    // 8. Sauvegarde Directe (Stream ou Buffer)
    const path = join(uploadDir, cleanFilename);
    const writeOpts = { highWaterMark: 1024 * 1024 }; // 1MB buffer pour écriture disque plus rapide

    if (fileStream) {
      // Écriture streamée (Idéal pour vidéos)
      await pipeline(fileStream, createWriteStream(path, writeOpts));
    } else if (fileBuffer) {
      // Écriture buffer (Petits fichiers)
      await writeFile(path, fileBuffer);
    } else {
       throw new Error("Aucune source de données valide (ni stream ni buffer)");
    }
    
    // Ajustement MimeType si générique
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (fileExtension === 'mov' || fileExtension === 'qt') {
        mimeType = 'video/quicktime';
      } else if (videoExtensions.includes(fileExtension)) {
        mimeType = `video/${fileExtension}`;
      } else if (imageExtensions.includes(fileExtension)) {
        mimeType = `image/${fileExtension}`;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      url: `/api/uploads/${cleanFilename}`,
      fileName: cleanFilename,
      type: mimeType,
      size: size,
    });
    
  } catch (error) {
    logApiError('Upload', error);
    return NextResponse.json(
      { success: false, message: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
