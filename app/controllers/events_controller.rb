class EventsController < ApplicationController
  before_action :set_event, only: [:show, :edit, :update, :claim]
  before_action :require_creator, only: [:edit, :update]

  def new
    @event = Event.new
  end

  def create
    @event = Event.new(event_params)
    build_time_slots
    build_questions

    if @event.save
      session["creator_token_#{@event.share_token}"] = @event.creator_token
      redirect_to event_path(@event), notice: "Event created! Share this page's URL with your friends."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @respondents = @event.respondents.includes(:time_slot_selections, :answers)
    @time_slots = @event.event_time_slots.order(:starts_at)
    @questions = @event.questions.order(:position)
    @is_creator = session["creator_token_#{@event.share_token}"] == @event.creator_token
    @my_respondent_token = session["respondent_token_#{@event.share_token}"]
  end

  def claim
    if ActiveSupport::SecurityUtils.secure_compare(params[:token].to_s, @event.creator_token)
      session["creator_token_#{@event.share_token}"] = @event.creator_token
      redirect_to event_path(@event), notice: "Creator access restored."
    else
      redirect_to event_path(@event), alert: "Invalid creator link."
    end
  end

  def edit
  end

  def update
    if @event.update(event_params)
      redirect_to event_path(@event), notice: "Event updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def set_event
    @event = Event.find_by!(share_token: params[:share_token])
  end

  def require_creator
    unless session["creator_token_#{@event.share_token}"] == @event.creator_token
      redirect_to event_path(@event), alert: "You don't have permission to edit this event."
    end
  end

  def event_params
    params.require(:event).permit(:title, :description, :location, :timezone)
  end

  def build_time_slots
    slots = params.dig(:event, :time_slots) || []
    slots.each do |slot|
      date = slot[:date]
      start_time = slot[:start_time]
      next if date.blank? || start_time.blank?

      starts_at = Time.zone.parse("#{date} #{start_time}")
      ends_at = slot[:end_time].present? ? Time.zone.parse("#{date} #{slot[:end_time]}") : nil

      @event.event_time_slots.build(starts_at: starts_at, ends_at: ends_at)
    end
  end

  def build_questions
    questions = params.dig(:event, :questions_attributes) || {}
    questions.each do |index, q|
      next if q[:prompt].blank?
      @event.questions.build(
        prompt: q[:prompt],
        question_type: q[:question_type] || "free_text",
        options: q[:options]&.reject(&:blank?),
        position: index.to_i
      )
    end
  end
end
