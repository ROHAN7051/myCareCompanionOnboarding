class LungLesionQuestionnaire {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3; // Update dynamically based on the API response
    this.answers = {}; // Store answers
    this.page = 1; // Track the current page number

    this.lastPage = 8; // This will be set based on the API response
    this.apiUrl = "https://api.mycarecompanion.co.uk/api/v1/section/order"; // Updated API base URL
    this.apiData = null; // To store API response data

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateProgress();
    this.updateButtonStates();
    this.addLoadingAnimation();
    this.makeApiCall(this.page); // Make API call on page load with page number
  }

  bindEvents() {
    const nextBtn = document.getElementById("nextBtn");
    const skipBtn = document.getElementById("skipBtn");

    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.handleNext());
    }
    if (skipBtn) {
      skipBtn.addEventListener("click", () => this.handleSkip());
    }

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (this.canProceed()) {
          this.handleNext();
        }
      }
    });
  }

  handleAnswerChange(input) {
    const questionId = input.dataset.questionId; // Make sure your HTML inputs have data-question-id
    console.log(questionId);
    const sectionId = this.apiData.section.sectionId;
    const questionType = input.dataset.questionType; // e.g., "single_choice", "number", "text", "date"
    let answerValue = input.value;

    // Convert value based on type
    switch (questionType) {
      case "number":
        answerValue = Number(answerValue);
        break;
      case "text":
        answerValue = String(answerValue);
        break;
      case "date":
        answerValue = answerValue; // Ensure it's in YYYY-MM-DD format
        break;
      case "single_choice":
      case "boolean":
      default:
        answerValue = answerValue; // Choice key like "yes", "no", "not_sure"
    }

    // Save locally in answers object
    this.answers[questionId] = {
      singleAnswer: answerValue,
      multipleAnswers: [],
    };

    // Handle multiple choice questions
    if (input.type === "checkbox") {
      const checkboxes = document.querySelectorAll(`input[name="${questionId}"]`);
      const selectedValues = [];
      checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
          selectedValues.push(checkbox.value);
        }
      });
      this.answers[questionId].multipleAnswers = selectedValues;
    }

    // Update button states
    this.updateButtonStates();

    // Add visual feedback for selected option
    const radioOption = input.closest(".radio-option");
    if (radioOption) {
      radioOption.style.transform = "scale(1.02)";
      setTimeout(() => {
        radioOption.style.transform = "";
      }, 150);
    }

    // Send POST request immediately
    this.submitAnswer(
      sectionId,
      questionId,
      questionType,
      answerValue,
      this.answers[questionId].multipleAnswers
    );
  }

  // New function to submit the answer
  submitAnswer(
    sectionId,
    questionId,
    questionType,
    singleAnswer,
    multipleAnswers
  ) {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODljNGI3ZGY3OTNjMTY2NTMyYTEzZGQiLCJleHAiOjE3NTc4Mzc2MzIsImlhdCI6MTc1NTI0NTYzMn0.1KQFapcstr5b_QF59-Lp8-ecx0ZOvnWL5Z1GvuHPQ0Y";

    const payload = {
      sectionId,
      questionId,
      answer: {
        singleAnswer: singleAnswer,
        multipleAnswers: multipleAnswers || [],
      },
    };

    console.log("Submitting payload:", payload);

    fetch("https://api.mycarecompanion.co.uk/api/v1/answer/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("Answer submitted successfully:", data);
        } else {
          console.warn("Server error:", data.message);
        }
      })
      .catch((err) => {
        console.error("Error submitting answer:", err);
      });
  }
  getCurrentQuestionId() {
    if (!this.apiData || !this.apiData.section || !this.apiData.section.questions) return null;
    const questions = this.apiData.section.questions;
    if (questions.length === 0) return null;
    
    // Return the first question's ID since we're showing all questions on one page
    return questions[0]?.questionId || null;
  }
  handleNext() {
    // Validation check
    if (!this.canProceed()) {
      this.showValidationMessage();
      return;
    }

    console.log("next is clicked");

    // Check if we're at the last page
    if (this.page >= this.lastPage) {
      window.location.href =
        "https://mycarecompanion-yrf3xy-development.flutterflow.app/loadingScreen";
      return;
    }

    // Increment page and make API call
    this.page++;
    console.log("Calling API with page:", this.page);
    this.makeApiCall(this.page);
  }

  handleSkip() {
    // Check if we're at the last page
    if (this.page >= this.lastPage) {
      window.location.href =
        "https://mycarecompanion-yrf3xy-development.flutterflow.app/loadingScreen";
      return;
    }

    // Increment page and make API call
    this.page++;
    console.log("Skipping to page:", this.page);
    this.makeApiCall(this.page);
  }

  showStep(step) {
    const steps = document.querySelectorAll(".step");

    steps.forEach((stepElement, index) => {
      stepElement.classList.toggle("active", index === step - 1);
    });

    // Scroll to top smoothly
    document.querySelector(".questionnaire-container").scrollIntoView({
      behavior: "smooth",
    });
  }

  updateProgress() {
    const progressBar = document.getElementById("progressBar");
    const progress = (this.currentStep / this.totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
  }

  updateButtonStates() {
    const nextBtn = document.getElementById("nextBtn");
    const skipBtn = document.getElementById("skipBtn");

    if (!nextBtn || !skipBtn) return;

    // Update Next button text based on page
    if (this.page >= this.lastPage) {
      nextBtn.textContent = "Complete";
      skipBtn.style.display = "none";
    } else {
      nextBtn.textContent = "Next →";
      skipBtn.style.display = "block";
    }
  }

  canProceed() {
    // Check if at least one question has been answered
    if (!this.apiData || !this.apiData.section || !this.apiData.section.questions) {
      return false;
    }
    
    const questions = this.apiData.section.questions;
    return questions.some(question => this.answers[question.questionId] !== undefined);
  }

  showValidationMessage() {
    const existingMessage = document.querySelector(".validation-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const message = document.createElement("div");
    message.className = "validation-message";
    message.textContent = "Please select an answer to continue";

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 2000);
  }

  handleSubmit() {
    const nextBtn = document.getElementById("nextBtn");
    const originalText = nextBtn.textContent;

    nextBtn.textContent = "Submitting...";
    nextBtn.disabled = true;

    setTimeout(() => {
      this.showCompletionMessage();
      nextBtn.textContent = originalText;
      nextBtn.disabled = false;
    }, 1500);
  }

  showCompletionMessage() {
    const message = document.createElement("div");
    message.className = "completion-message";
    message.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 8px;">✓ Questionnaire Complete</div>
            <div style="font-size: 14px; opacity: 0.9;">Thank you for providing this information</div>
        `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
      this.resetQuestionnaire();
    }, 3000);
  }

  resetQuestionnaire() {
    this.currentStep = 1;
    this.answers = {};

    document.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = false;
    });

    this.showStep(1);
    this.updateProgress();
    this.updateButtonStates();
  }

  addLoadingAnimation() {
    document.body.style.opacity = "0";
    setTimeout(() => {
      document.body.style.opacity = "1";
      document.body.style.transition = "opacity 0.5s ease";
    }, 100);
  }

  async makeApiCall(page) {
    try {
      // Show loading state
      const formContainer = document.getElementById("questionnaireForm");
      formContainer.innerHTML = "<p>Loading questions...</p>";
      
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODljNGI3ZGY3OTNjMTY2NTMyYTEzZGQiLCJleHAiOjE3NTc4Mzc2MzIsImlhdCI6MTc1NTI0NTYzMn0.1KQFapcstr5b_QF59-Lp8-ecx0ZOvnWL5Z1GvuHPQ0Y"; // Replace with actual token
      const response = await fetch(`${this.apiUrl}?page=${page}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("API Response Data:", data); // Log the full response data

      // Assign the API data to be used in the renderQuestions method
      this.apiData = data;

      // Update lastPage from API response if available
      if (data.lastPage) {
        this.lastPage = data.lastPage;
      }

      if (
        this.apiData &&
        this.apiData.section &&
        this.apiData.section.questions
      ) {
        this.totalSteps = this.apiData.section.questions.length; // Update total steps based on question count
        this.currentStep = 1; // Reset to first step for new page
        this.renderQuestions();
        this.updateProgress();
        this.updateButtonStates();
      } else {
        console.error("No questions found in the API response");
        formContainer.innerHTML =
          "<p>No questions available</p>";
      }
    } catch (error) {
      console.error("API call error:", error);
      const formContainer = document.getElementById("questionnaireForm");
      formContainer.innerHTML = "<p>Error loading questions. Please try again.</p>";
    }
  }

  renderQuestions() {
    const formContainer = document.getElementById("questionnaireForm");

    // Clear any previous questions before rendering new ones
    formContainer.innerHTML = "";

    if (
      !this.apiData ||
      !this.apiData.section ||
      !this.apiData.section.questions
    ) {
      console.error("No data found for rendering questions");
      return (formContainer.innerHTML = `<div><p>No data found</p></div>`);
    }

    console.log("Rendering questions:", this.apiData.section.questions);

    this.apiData.section.questions.forEach((question) => {
      const questionElement = document.createElement("div");
      questionElement.classList.add("question-container");

      const questionTitle = document.createElement("h2");
      questionTitle.classList.add("question-title");
      questionTitle.textContent = question.text;

      questionElement.appendChild(questionTitle);

      const addDataAttribute = (input) => {
        input.dataset.questionId = question.questionId;
        input.dataset.sectionId = this.apiData.section.sectionId; // optional, if you want sectionId too
      };

      switch (question.type) {
        case "text":
          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.classList.add("text-input");
          textInput.name = question.questionId;
          textInput.value = question.selectedAnswer || "";
          textInput.dataset.questionType = "text";
          addDataAttribute(textInput);
          textInput.addEventListener("change", () =>
            this.handleAnswerChange(textInput)
          );
          questionElement.appendChild(textInput);
          break;

        case "date":
          const dateInput = document.createElement("input");
          dateInput.type = "date";
          dateInput.classList.add("date-input");
          dateInput.name = question.questionId;
          dateInput.dataset.questionType = "date";
          addDataAttribute(dateInput);
          dateInput.addEventListener("change", () =>
            this.handleAnswerChange(dateInput)
          );
          questionElement.appendChild(dateInput);
          break;

        case "number":
          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.classList.add("number-input");
          numberInput.name = question.questionId;
          numberInput.dataset.questionType = "number";
          addDataAttribute(numberInput);
          numberInput.addEventListener("change", () =>
            this.handleAnswerChange(numberInput)
          );
          questionElement.appendChild(numberInput);
          break;

        case "boolean":
          const booleanContainer = document.createElement("div");
          booleanContainer.classList.add("radio-group");

          const yesLabel = document.createElement("label");
          yesLabel.classList.add("radio-option");
          
          const yesInput = document.createElement("input");
          yesInput.type = "radio";
          yesInput.name = question.questionId;
          yesInput.value = "true";
          yesInput.dataset.questionType = "boolean";
          addDataAttribute(yesInput);
          yesInput.addEventListener("change", () =>
            this.handleAnswerChange(yesInput)
          );

          const yesCustom = document.createElement("span");
          yesCustom.classList.add("radio-custom");
          
          const yesText = document.createElement("span");
          yesText.classList.add("radio-text");
          yesText.textContent = "Yes";

          yesLabel.appendChild(yesInput);
          yesLabel.appendChild(yesCustom);
          yesLabel.appendChild(yesText);

          const noLabel = document.createElement("label");
          noLabel.classList.add("radio-option");

          const noInput = document.createElement("input");
          noInput.type = "radio";
          noInput.name = question.questionId;
          noInput.value = "false";
          noInput.dataset.questionType = "boolean";
          addDataAttribute(noInput);
          noInput.addEventListener("change", () =>
            this.handleAnswerChange(noInput)
          );

          const noCustom = document.createElement("span");
          noCustom.classList.add("radio-custom");
          
          const noText = document.createElement("span");
          noText.classList.add("radio-text");
          noText.textContent = "No";

          noLabel.appendChild(noInput);
          noLabel.appendChild(noCustom);
          noLabel.appendChild(noText);

          booleanContainer.appendChild(yesLabel);
          booleanContainer.appendChild(noLabel);
          questionElement.appendChild(booleanContainer);
          break;

        case "single_choice":
          const choiceContainer = document.createElement("div");
          choiceContainer.classList.add("radio-group");
          
          question.choices.forEach((choice) => {
            const label = document.createElement("label");
            label.classList.add("radio-option");

            const input = document.createElement("input");
            input.type = "radio";
            input.name = question.questionId;
            input.value = choice.key;
            input.dataset.questionType = "single_choice";
            addDataAttribute(input);
            input.addEventListener("change", () =>
              this.handleAnswerChange(input)
            );

            const custom = document.createElement("span");
            custom.classList.add("radio-custom");

            const text = document.createElement("span");
            text.classList.add("radio-text");
            text.textContent = choice.label;

            label.appendChild(input);
            label.appendChild(custom);
            label.appendChild(text);

            if (choice.key === question.selectedAnswer) {
              input.checked = true;
            }

            choiceContainer.appendChild(label);
          });
          
          questionElement.appendChild(choiceContainer);
          break;

        case "multi_choice":
          const multiChoiceContainer = document.createElement("div");
          multiChoiceContainer.classList.add("checkbox-group");
          
          question.choices.forEach((choice) => {
            const label = document.createElement("label");
            label.classList.add("checkbox-option");

            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = question.questionId;
            input.value = choice.key;
            input.dataset.questionType = "multi_choice";
            addDataAttribute(input);
            input.addEventListener("change", () =>
              this.handleAnswerChange(input)
            );

            const checkboxCustom = document.createElement("span");
            checkboxCustom.classList.add("checkbox-custom");
            
            const checkboxText = document.createElement("span");
            checkboxText.classList.add("checkbox-text");
            checkboxText.textContent = choice.label;

            label.appendChild(input);
            label.appendChild(checkboxCustom);
            label.appendChild(checkboxText);
            multiChoiceContainer.appendChild(label);
          });
          
          questionElement.appendChild(multiChoiceContainer);
          break;

        case "file":
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.name = question.questionId;
          addDataAttribute(fileInput);
          fileInput.addEventListener("change", () =>
            this.handleAnswerChange(fileInput)
          );
          questionElement.appendChild(fileInput);
          break;

        default:
          console.warn(`Unsupported question type: ${question.type}`);
          break;
      }

      formContainer.appendChild(questionElement);
    });
  }

  getResults() {
    return {
      answers: this.answers,
      completedAt: new Date().toISOString(),
      totalSteps: this.totalSteps,
    };
  }
}

// Initialize the questionnaire when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const questionnaire = new LungLesionQuestionnaire();

  window.questionnaire = questionnaire;
});
