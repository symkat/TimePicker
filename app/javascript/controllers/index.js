// Import controllers using bare specifiers that match the importmap.
// (Rails' auto-generated relative imports don't work with importmap fingerprinting.)

import { application } from "controllers/application"

import ClipboardController from "controllers/clipboard_controller"
application.register("clipboard", ClipboardController)

import DateTimePickerController from "controllers/date_time_picker_controller"
application.register("date-time-picker", DateTimePickerController)

import HelloController from "controllers/hello_controller"
application.register("hello", HelloController)

import QuestionOptionsController from "controllers/question_options_controller"
application.register("question-options", QuestionOptionsController)

import QuestionsController from "controllers/questions_controller"
application.register("questions", QuestionsController)

import TimeSlotsController from "controllers/time_slots_controller"
application.register("time-slots", TimeSlotsController)

import TimezoneController from "controllers/timezone_controller"
application.register("timezone", TimezoneController)
