class ResponsesController < ApplicationController
  before_action :set_event

  def create
    @respondent = @event.respondents.build(name: params[:respondent][:name])

    ActiveRecord::Base.transaction do
      @respondent.save!

      # Save time slot selections
      selected_slot_ids = params[:respondent][:time_slot_ids] || []
      selected_slot_ids.each do |slot_id|
        @respondent.time_slot_selections.create!(event_time_slot_id: slot_id)
      end

      # Save answers
      answers = params[:respondent][:answers] || {}
      answers.each do |question_id, value|
        answer_value = value.is_a?(Array) ? value.reject(&:blank?).to_json : value
        @respondent.answers.create!(question_id: question_id, value: answer_value)
      end
    end

    redirect_to event_path(@event), notice: "Thanks, #{@respondent.name}! Your response has been recorded."
  rescue ActiveRecord::RecordInvalid
    redirect_to event_path(@event), alert: "Please fill in your name."
  end

  private

  def set_event
    @event = Event.find_by!(share_token: params[:event_share_token])
  end
end
