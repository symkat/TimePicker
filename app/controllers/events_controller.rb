class EventsController < ApplicationController
  before_action :set_event, only: [:show, :edit, :update]
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
      next if slot[:starts_at].blank?
      @event.event_time_slots.build(
        starts_at: slot[:starts_at],
        ends_at: slot[:ends_at].presence
      )
    end
  end

  def build_questions
    questions = params.dig(:event, :questions_attributes) || []
    questions.each_with_index do |q, i|
      next if q[:prompt].blank?
      @event.questions.build(
        prompt: q[:prompt],
        question_type: q[:question_type] || "free_text",
        options: q[:options]&.reject(&:blank?),
        position: i
      )
    end
  end
end
