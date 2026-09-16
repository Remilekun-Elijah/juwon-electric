import Vacancy from '../models/Vacancy.js';
import sanitizeHtml from 'sanitize-html';
import { isMongoMode } from '../services/runtime.js';
import {
  listCollection,
  getCollectionItem,
  createCollectionItem,
  findCollectionItem,
  updateCollectionItem,
  // deleteSupport via updateCollectionItem with isActive=false or remove directly below
  // but store.js does not export a delete helper; we'll implement a simple remove via update to isActive=false
  readDb,
  saveDb,
} from '../services/store.js';

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
    if (isMongoMode()) {
      const vacancies = await Vacancy.find({ status: 'open' }).sort({ postedAt: -1 }).lean();
      return res.json({ success: true, data: vacancies });
    }

    const items = await listCollection('vacancies');
    const open = (items || []).filter((v) => v.status === 'open');
    open.sort((a, b) => new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0));
    return res.json({ success: true, data: open });
  } catch (err) {
    console.error('listVacancies error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getVacancy = async (req, res) => {
  try {
    const { slug } = req.params;
    if (isMongoMode()) {
      const vacancy = await Vacancy.findOne({ slug }).lean();
      if (!vacancy) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: vacancy });
    }

    try {
      const vacancy = await getCollectionItem('vacancies', slug);
      return res.json({ success: true, data: vacancy });
    } catch (e) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
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

    if (isMongoMode()) {
      const existing = await Vacancy.findOne({ slug: finalSlug });
      if (existing) return res.status(400).json({ success: false, message: 'Slug already exists' });

      const payload = { ...req.body, slug: finalSlug, descriptionHtml: safeHtml };
      if (req.header('X-User-Id')) payload.postedBy = req.header('X-User-Id');

      const created = await Vacancy.create(payload);
      return res.status(201).json({ success: true, data: created });
    }

    // JSON store path
    const existing = await findCollectionItem('vacancies', { slug: finalSlug }).catch(() => null);
    if (existing) return res.status(400).json({ success: false, message: 'Slug already exists' });

    const payload = { ...req.body, slug: finalSlug, descriptionHtml: safeHtml, status: req.body.status || 'open', postedAt: new Date().toISOString() };
    if (req.header('X-User-Id')) payload.postedBy = req.header('X-User-Id');

    const created = await createCollectionItem('vacancies', payload);
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

    if (isMongoMode()) {
      const updated = await Vacancy.findByIdAndUpdate(id, updates, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: updated });
    }

    const updated = await updateCollectionItem('vacancies', id, updates);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoMode()) {
      const removed = await Vacancy.findByIdAndDelete(id);
      if (!removed) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, message: 'Deleted' });
    }

    // In JSON store, mark as inactive to preserve history
    const removed = await updateCollectionItem('vacancies', id, { isActive: false });
    if (!removed) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('deleteVacancy error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
