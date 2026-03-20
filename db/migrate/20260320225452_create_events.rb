class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events do |t|
      t.string :title
      t.text :description
      t.string :location
      t.string :timezone
      t.string :share_token, null: false
      t.string :creator_token, null: false

      t.timestamps
    end

    add_index :events, :share_token, unique: true
  end
end
