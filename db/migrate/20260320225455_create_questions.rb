class CreateQuestions < ActiveRecord::Migration[8.1]
  def change
    create_table :questions do |t|
      t.references :event, null: false, foreign_key: true
      t.string :prompt
      t.string :question_type
      t.text :options
      t.integer :position

      t.timestamps
    end
  end
end
