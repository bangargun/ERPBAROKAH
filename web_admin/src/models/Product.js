// Product Data Model Entity
export class Product {
  constructor({ id, name, category, price, isPopular, outlet_id, standardPrices = {} }) {
    this.id = id;
    this.name = name;
    this.category = category || 'Umum';
    this.price = price || 0;
    this.isPopular = !!isPopular;
    this.outlet_id = outlet_id || null;
    this.standardPrices = standardPrices;
  }

  static fromJson(json) {
    return new Product({
      id: json.id,
      name: json.name,
      category: json.category,
      price: json.price,
      isPopular: json.isPopular || json.is_popular,
      outlet_id: json.outlet_id,
      standardPrices: json.standardPrices || {}
    });
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      price: this.price,
      isPopular: this.isPopular,
      outlet_id: this.outlet_id,
      standardPrices: this.standardPrices
    };
  }
}
