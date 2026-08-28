import HeroSlide from '../models/HeroSlide.js';
import fs from 'fs';
import path from 'path';

// Helper to save base64 image to uploads/hero directory
const saveBase64Image = (base64String, req) => {
  if (!base64String || typeof base64String !== 'string') return '';
  
  // If it's already a regular URL (http, https, /uploads), return it directly
  if (!base64String.startsWith('data:image')) {
    return base64String;
  }

  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64String;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    const uploadDir = path.join(process.cwd(), 'uploads', 'hero');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `hero-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/hero/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return base64String;
  }
};

// Helper to delete old image file from disk
const deleteOldHeroImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('/uploads/hero/')) return;
  try {
    const urlObj = new URL(imageUrl);
    const relativePath = urlObj.pathname;
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    // If URL parsing fails, attempt relative path lookup
    try {
      const parts = imageUrl.split('/uploads/hero/');
      if (parts[1]) {
        const fullPath = path.join(process.cwd(), 'uploads', 'hero', parts[1]);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (e) {
      console.error('Error cleaning up hero image file:', e);
    }
  }
};

export const getHeroSlides = async (req, res) => {
  try {
    // If it's the public storefront, they might only want active slides.
    // The admin panel will want all slides to manage them.
    const query = req.query.admin ? {} : { isActive: true };
    const slides = await HeroSlide.find(query).sort({ order: 1 });
    
    res.status(200).json({
      status: true,
      data: slides,
    });
  } catch (error) {
    console.error('Error fetching hero slides:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const createHeroSlide = async (req, res) => {
  try {
    const { title, subtitle, image, ctaText, ctaLink, isActive, order } = req.body;
    
    // Process image (convert base64 to file URL if needed)
    const processedImage = saveBase64Image(image, req);

    // Automatically assign next order if not provided
    let slideOrder = order;
    if (slideOrder === undefined) {
      const maxOrderSlide = await HeroSlide.findOne().sort({ order: -1 });
      slideOrder = maxOrderSlide ? maxOrderSlide.order + 1 : 1;
    }

    const newSlide = await HeroSlide.create({
      title,
      subtitle,
      image: processedImage,
      ctaText,
      ctaLink,
      isActive,
      order: slideOrder,
    });

    res.status(201).json({
      status: true,
      data: newSlide,
    });
  } catch (error) {
    console.error('Error creating hero slide:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const updateHeroSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({ status: false, message: 'Slide not found' });
    }

    const updateData = { ...req.body };
    if (req.body.image) {
      const processedImage = saveBase64Image(req.body.image, req);
      updateData.image = processedImage;

      // If a new file was uploaded and replaces an old uploaded file, clean up old file
      if (slide.image && slide.image !== processedImage && slide.image.includes('/uploads/hero/')) {
        deleteOldHeroImage(slide.image);
      }
    }

    const updatedSlide = await HeroSlide.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: true,
      data: updatedSlide,
    });
  } catch (error) {
    console.error('Error updating hero slide:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const deleteHeroSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      return res.status(404).json({ status: false, message: 'Slide not found' });
    }

    if (slide.image) {
      deleteOldHeroImage(slide.image);
    }

    await HeroSlide.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: true,
      message: 'Slide deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting hero slide:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};

export const reorderHeroSlides = async (req, res) => {
  try {
    const { slides } = req.body; // Array of { id, order }

    if (!slides || !Array.isArray(slides)) {
      return res.status(400).json({ status: false, message: 'Invalid payload' });
    }

    // Use Promise.all to perform bulk updates
    await Promise.all(
      slides.map((slide) =>
        HeroSlide.findByIdAndUpdate(slide.id, { order: slide.order })
      )
    );

    res.status(200).json({
      status: true,
      message: 'Slides reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering hero slides:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
};
