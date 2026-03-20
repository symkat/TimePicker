Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "pages#home"

  resources :events, only: [:new, :create], param: :share_token
  resources :events, only: [:show, :edit, :update], param: :share_token do
    resources :responses, only: [:create], controller: "responses"
  end
end
