class CreateRespondents < ActiveRecord::Migration[8.1]
  def change
    create_table :respondents do |t|
      t.references :event, null: false, foreign_key: true
      t.string :name

      t.timestamps
    end
  end
end
