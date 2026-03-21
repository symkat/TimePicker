class ResponsesController < ApplicationController
  before_action :set_event
  before_action :set_respondent, only: [ :edit, :update, :destroy ]
  # Having the edit_token in the URL is sufficient authorization for edit/update.
  # The token is a 32-char secret — if you have it, you're allowed.
  before_action :require_creator, only: [ :destroy ]
  before_action :require_not_finalized, only: [ :create ]

  def create
    @respondent = @event.respondents.build(name: params[:respondent][:name])

    ActiveRecord::Base.transaction do
      @respondent.save!

      save_selections(@respondent)
      save_answers(@respondent)
    end

    session["respondent_token_#{@event.share_token}"] = @respondent.edit_token
    redirect_to event_path(@event), notice: "Thanks, #{@respondent.name}! Your response has been recorded."
  rescue ActiveRecord::RecordInvalid
    redirect_to event_path(@event), alert: "Please fill in your name."
  end

  def edit
    @time_slots = @event.event_time_slots.order(:starts_at)
    @questions = @event.questions.order(:position)
    @selected_slot_ids = @respondent.time_slot_selections.pluck(:event_time_slot_id).to_set
    @answers_by_question = @respondent.answers.index_by(&:question_id)
  end

  def update
    ActiveRecord::Base.transaction do
      @respondent.update!(name: params[:respondent][:name])

      @respondent.time_slot_selections.destroy_all
      save_selections(@respondent)

      @respondent.answers.destroy_all
      save_answers(@respondent)
    end

    session["respondent_token_#{@event.share_token}"] = @respondent.edit_token
    redirect_to event_path(@event), notice: "Your response has been updated."
  rescue ActiveRecord::RecordInvalid
    redirect_to event_path(@event), alert: "Please fill in your name."
  end

  def destroy
    name = @respondent.name
    @respondent.destroy
    redirect_to event_path(@event), notice: "#{name}'s response has been removed."
  end

  private

  def set_event
    @event = Event.find_by!(share_token: params[:event_share_token])
  end

  def set_respondent
    @respondent = @event.respondents.find_by!(edit_token: params[:edit_token])
  end

  def require_creator
    unless is_creator?
      redirect_to event_path(@event), alert: "You don't have permission to delete this response."
    end
  end

  def is_creator?
    session["creator_token_#{@event.share_token}"] == @event.creator_token
  end

  def require_not_finalized
    if @event.finalized?
      redirect_to event_path(@event), alert: "This event has been finalized and is no longer accepting new responses."
    end
  end

  def save_selections(respondent)
    selected_slot_ids = params[:respondent][:time_slot_ids] || []
    selected_slot_ids.each do |slot_id|
      slot = @event.event_time_slots.find(slot_id)
      respondent.time_slot_selections.create!(event_time_slot: slot)
    end
  end

  def save_answers(respondent)
    answers = params[:respondent][:answers] || {}
    answers.each do |question_id, value|
      question = @event.questions.find(question_id)
      answer_value = value.is_a?(Array) ? value.reject(&:blank?).to_json : value
      respondent.answers.create!(question: question, value: answer_value)
    end
  end
end
