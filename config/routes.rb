Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "pages#home"

  resources :events, only: [:new, :create, :show, :edit, :update], param: :share_token do
    member do
      get :claim
    end
    resources :responses, only: [:create], param: :edit_token, controller: "responses" do
      member do
        get :edit
        patch :update
        delete :destroy
      end
    end
  end
end
