import catalogSeed from './googleSheetsCatalogSeed.json';
import { products as localProducts, categories as localCategories } from './products';

const localProductsById = new Map(localProducts.map((product) => [String(product.id), product]));

export const googleSheetsProductSeed = catalogSeed.products.map((record) => {
  const local = localProductsById.get(String(record.id)) || {};
  const category = catalogSeed.categories.find((item) => item.name === record.category);

  return {
    ...local,
    ...record,
    id: String(record.id),
    nameEn: record.name_en || local.nameEn || '',
    name_en: record.name_en || local.nameEn || '',
    companyEn: record.company_en || local.companyEn || '',
    company_en: record.company_en || local.companyEn || '',
    categoryEn: category?.name_en || local.categoryEn || '',
    category_en: category?.name_en || local.categoryEn || '',
    price: Number(record.price) > 0 ? Number(record.price) : Number(local.price || 0),
    isActive: record.is_active !== false,
  };
});

export const googleSheetsCategorySeed = catalogSeed.categories.map((record) => ({
  id: String(record.id),
  name: record.name,
  nameEn: record.name_en,
  name_en: record.name_en,
  isActive: record.is_active !== false,
  sortOrder: Number(record.sort_order || 0),
}));
