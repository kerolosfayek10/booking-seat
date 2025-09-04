import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Anon Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadReceipt(file: Express.Multer.File, userId: string): Promise<string | null> {
    try {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.error('File too large:', file.size);
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.mimetype)) {
        console.error('Invalid file type:', file.mimetype);
        throw new Error('File type not supported. Please use JPG, PNG, GIF, or PDF');
      }

      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      console.log(`Uploading file: ${filePath}, Size: ${file.size} bytes, Type: ${file.mimetype}`);

      // Retry logic for file upload
      let uploadSuccess = false;
      let uploadData = null;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Upload attempt ${attempt}/3`);
          
          const { data, error } = await Promise.race([
            this.supabase.storage
              .from('booking')
              .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
              }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout after 25 seconds')), 25000)
            )
          ]) as any;

          if (error) {
            lastError = error;
            console.error(`Upload attempt ${attempt} failed:`, error);
            
            // If file already exists, try with a new name
            if (error.message?.includes('already exists')) {
              const newFileName = `${userId}-${Date.now()}-${attempt}.${fileExt}`;
              const newFilePath = `receipts/${newFileName}`;
              console.log(`File exists, trying new name: ${newFilePath}`);
              continue;
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            continue;
          }

          uploadData = data;
          uploadSuccess = true;
          console.log(`Upload successful on attempt ${attempt}`);
          break;
        } catch (timeoutError) {
          lastError = timeoutError;
          console.error(`Upload attempt ${attempt} timed out:`, timeoutError);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }
      }

      if (!uploadSuccess) {
        console.error('All upload attempts failed. Last error:', lastError);
        throw new Error(`Upload failed after 3 attempts: ${lastError?.message || lastError}`);
      }

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from('booking')
        .getPublicUrl(filePath);

      console.log('Upload completed successfully, URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error; // Re-throw to let the caller handle it
    }
  }
}
