import Vacancy from '../models/Vacancy.js';
import sanitizeHtml from 'sanitize-html';

function slugify(text) {
  return (
    (text || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    ''
  );
}

export const listVacancies = async (req, res) => {
  try {
    const vacancies = await Vacancy.find({ status: 'open' }).sort({ postedAt: -1 }).lean();
    return res.json({ success: true, data: vacancies });
  } catch (err) {
    console.error('listVacancies error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getVacancy = async (req, res) => {
  try {
    const { slug } = req.params;
    const vacancy = await Vacancy.findOne({ slug }).lean();
    if (!vacancy) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: vacancy });
  } catch (err) {
    console.error('getVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createVacancy = async (req, res) => {
  try {
    const { title, slug, descriptionHtml } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const finalSlug = slug || slugify(title);
    const safeHtml = sanitizeHtml(descriptionHtml || '', { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) });

    const existing = await Vacancy.findOne({ slug: finalSlug });
    if (existing) return res.status(400).json({ success: false, message: 'Slug already exists' });

    const payload = { ...req.body, slug: finalSlug, descriptionHtml: safeHtml };
    if (req.header('X-User-Id')) payload.postedBy = req.header('X-User-Id');

    const created = await Vacancy.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('createVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.descriptionHtml) {
      updates.descriptionHtml = sanitizeHtml(updates.descriptionHtml, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']) });
    }
    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title);
    }

    const updated = await Vacancy.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Vacancy.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('deleteVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
