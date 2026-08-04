// Transaction Data Model Entity
export class Transaction {
  constructor({ id, branch_id, type, category, amount, description, payment_method, date, created_by, status }) {
    this.id = id || Date.now();
    this.branch_id = branch_id;
    this.type = type || 'income';
    this.category = category || 'Penjualan';
    this.amount = amount || 0;
    this.description = description || '';
    this.payment_method = payment_method || 'CASH';
    this.date = date || new Date().toISOString().split('T')[0];
    this.created_by = created_by || 'Kasir';
    this.status = status || 'approved';
  }

  static fromJson(json) {
    return new Transaction({
      id: json.id,
      branch_id: json.branch_id,
      type: json.type,
      category: json.category,
      amount: json.amount,
      description: json.description,
      payment_method: json.payment_method,
      date: json.date,
      created_by: json.created_by,
      status: json.status
    });
  }

  toJson() {
    return {
      id: this.id,
      branch_id: this.branch_id,
      type: this.type,
      category: this.category,
      amount: this.amount,
      description: this.description,
      payment_method: this.payment_method,
      date: this.date,
      created_by: this.created_by,
      status: this.status
    };
  }
}
