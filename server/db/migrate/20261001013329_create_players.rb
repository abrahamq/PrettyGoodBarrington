class CreatePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :players do |t|
      t.string :name, null: false
      t.string :token_digest, null: false
      t.integer :stamps, null: false, default: 0
      t.integer :tips_cents, null: false, default: 0
      t.datetime :submitted_at, null: false
      t.timestamps
    end

    add_index :players, :name, unique: true
    add_index :players, :token_digest, unique: true
    add_index :players, [:stamps, :tips_cents, :submitted_at]
  end
end
