class AddEditTokenToRespondents < ActiveRecord::Migration[8.1]
  def up
    add_column :respondents, :edit_token, :string

    Respondent.reset_column_information
    Respondent.find_each do |r|
      r.update_column(:edit_token, SecureRandom.hex(16))
    end

    change_column_null :respondents, :edit_token, false
    add_index :respondents, :edit_token, unique: true
  end

  def down
    remove_column :respondents, :edit_token
  end
end
