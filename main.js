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
      default:
        answerValue = answerValue; // Choice key like "yes", "no", "not_sure"
    }

    // Save locally in answers object
    this.answers[questionId] = {
      singleAnswer: answerValue,
      multipleAnswers: input.multiple
        ? [...input.selectedOptions].map((o) => o.value)
        : [],
    };

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
    if (!this.apiData || !this.apiData.section) return null;
    const questions = this.apiData.section.questions; // Assuming API returns array of questions
    if (!questions || questions.length === 0) return null;

    // currentStep is 1-indexed
    return questions[this.currentStep - 1]?.questionId || null;
  }
  handleNext() {
    // Validation check
    if (!this.canProceed()) {
      this.showValidationMessage();
      return;
    }

    console.log("next is clicked");

    // Increment current step
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.showStep(this.currentStep);
      this.updateProgress();
      this.updateButtonStates();

      // Increment page only if it doesn't exceed lastPage
      if (this.page < this.lastPage) {
        this.page++;
      }

      // Call API with updated page
      console.log("Calling API with page:", this.page); // for debugging
      this.makeApiCall(this.page);
    } else {
      // Last step: handle submit
      this.handleSubmit();
    }

    // Redirect if page exceeds lastPage
    if (this.page > this.lastPage) {
      window.location.href =
        "https://mycarecompanion-yrf3xy-development.flutterflow.app/loadingScreen";
    }
  }

  handleSkip() {
    if (this.page < this.lastPage) {
      this.page++;
    }

    if (this.page > this.lastPage) {
      // Redirect to the loading screen if page exceeds lastPage
      window.location.href =
        "https://mycarecompanion-yrf3xy-development.flutterflow.app/loadingScreen";
      return; // Stop further execution
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.showStep(this.currentStep);
      this.updateProgress();
      this.updateButtonStates();

      // Make the API call when skipping to the next step with updated page number
      this.makeApiCall(this.page);
    }
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

    // Update Next button text
    if (this.currentStep === this.totalSteps) {
      nextBtn.textContent = "Complete";
      skipBtn.style.display = "none";
    } else {
      nextBtn.textContent = "Next →";
      skipBtn.style.display = "block";
    }

    // Enable/disable Next button based on answer
    // nextBtn.disabled = !this.canProceed();
  }

  canProceed() {
    // Always allow proceeding on the last step
    if (this.currentStep === this.totalSteps) return true;

    const questionId = this.getCurrentQuestionId();
    if (!questionId) return false;

    // Return true if answer exists
    return this.answers[questionId] !== undefined;
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

      if (
        this.apiData &&
        this.apiData.section &&
        this.apiData.section.questions
      ) {
        this.totalSteps = this.apiData.section.questions.length; // Update total steps based on question count
        this.renderQuestions();
      } else {
        console.error("No questions found in the API response");
        document.getElementById("questionnaireForm").innerHTML =
          "<p>No questions available</p>";
      }
    } catch (error) {
      console.error("API call error:", error);
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
          textInput.name = question.questionId;
          textInput.value = question.selectedAnswer || "";
          addDataAttribute(textInput);
          textInput.addEventListener("change", () =>
            this.handleAnswerChange(textInput)
          );
          questionElement.appendChild(textInput);
          break;

        case "date":
          const dateInput = document.createElement("input");
          dateInput.type = "date";
          dateInput.name = question.questionId;
          addDataAttribute(dateInput);
          dateInput.addEventListener("change", () =>
            this.handleAnswerChange(dateInput)
          );
          questionElement.appendChild(dateInput);
          break;

        case "number":
          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.name = question.questionId;
          addDataAttribute(numberInput);
          numberInput.addEventListener("change", () =>
            this.handleAnswerChange(numberInput)
          );
          questionElement.appendChild(numberInput);
          break;

        case "boolean":
          const booleanContainer = document.createElement("div");

          const yesInput = document.createElement("input");
          yesInput.type = "radio";
          yesInput.name = question.questionId;
          yesInput.value = "true";
          addDataAttribute(yesInput);
          yesInput.addEventListener("change", () =>
            this.handleAnswerChange(yesInput)
          );

          const yesLabel = document.createElement("label");
          yesLabel.appendChild(yesInput);
          yesLabel.appendChild(document.createTextNode("Yes"));

          const noInput = document.createElement("input");
          noInput.type = "radio";
          noInput.name = question.questionId;
          noInput.value = "false";
          addDataAttribute(noInput);
          noInput.addEventListener("change", () =>
            this.handleAnswerChange(noInput)
          );

          const noLabel = document.createElement("label");
          noLabel.appendChild(noInput);
          noLabel.appendChild(document.createTextNode("No"));

          booleanContainer.appendChild(yesLabel);
          booleanContainer.appendChild(noLabel);
          questionElement.appendChild(booleanContainer);
          break;

        case "single_choice":
          question.choices.forEach((choice) => {
            const label = document.createElement("label");
            label.classList.add("radio-option");

            const input = document.createElement("input");
            input.type = "radio";
            input.name = question.questionId;
            input.value = choice.key;
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

            questionElement.appendChild(label);
          });
          break;

        case "multi_choice":
          question.choices.forEach((choice) => {
            const label = document.createElement("label");
            label.classList.add("checkbox-option");

            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = question.questionId;
            input.value = choice.key;
            addDataAttribute(input);
            input.addEventListener("change", () =>
              this.handleAnswerChange(input)
            );

            label.appendChild(input);
            label.appendChild(document.createTextNode(choice.label));
            questionElement.appendChild(label);
          });
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
