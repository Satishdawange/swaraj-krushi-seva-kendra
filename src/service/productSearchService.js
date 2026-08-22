export function findSimilarProducts(
  products,
  productName,
  shortDescription,
  usageDescription,
) {
  const searchText = [productName, shortDescription, usageDescription]

    .filter(Boolean)

    .join(" ")

    .toLowerCase();

  if (!searchText.trim()) {
    return [];
  }

  const words = searchText.split(/\s+/).filter((word) => word.length > 2);

  const results = products
    .map((product) => {
      const productText = [
        product.name,

        product.name_en,

        product.company,

        product.company_en,

        product.category,

        product.short,

        product.description,

        product.crops,

        product.usage,
      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      let score = 0;

      words.forEach((word) => {
        if (productText.includes(word)) {
          score++;
        }
      });

      return {
        product,

        score,
      };
    })

    .filter((item) => item.score > 0)

    .sort((a, b) => b.score - a.score);

  return results.slice(0, 3).map((item) => item.product);
}
