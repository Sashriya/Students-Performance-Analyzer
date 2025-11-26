from fastapi import FastAPI, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pypdf import PdfReader
from PIL import Image
import io
import re

# ---------------------------
# CONFIGURE GEMINI
# ---------------------------
genai.configure(api_key="YOUR_API_KEY_HERE")
model = genai.GenerativeModel("gemini-2.0-flash")

app = FastAPI()

# ---------------------------
# CORS
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# SIMPLE PROFANITY FILTER
# ---------------------------
BAD_WORDS = ["badword1", "badword2", "fuck", "shit", "bitch"]
BAD_RE = re.compile("|".join(re.escape(w) for w in BAD_WORDS), re.IGNORECASE)

def clean_text(text: str) -> str:
    """Removes any harmful words from AI output."""
    return BAD_RE.sub("****", text)


# ---------------------------
# LOAD IMAGE
# ---------------------------
def load_image(file):
    img_bytes = file.file.read()
    return Image.open(io.BytesIO(img_bytes))


# ---------------------------
# EXTRACT PDF
# ---------------------------
def extract_pdf(file):
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages:
        t = page.extract_text() or ""
        text += t + "\n"
    return text


# ---------------------------
# MARKSHEET ANALYZER ENDPOINT
# ---------------------------
@app.post("/analyze-marksheet")
async def analyze_marksheet(image: UploadFile = Form(...)):
    # decide file type
    if image.filename.endswith(".pdf"):
        text = extract_pdf(image)
        img = None
    else:
        img = load_image(image)
        text = ""

    prompt = f"""
You are an AI Student Performance Analyzer.

If marks are low, return JSON with:
- Weak skills
- Why marks might be low
- Advice for student
- Parental guidance including:
  • avoid phone/gadgets
  • consequences of parents blaming children
  • how parents can support positively
  • discipline building
- Motivational message
- Ask student: "Tell me honestly, why do you struggle to concentrate?"

If marks are average/high:
- strengths
- improvement tips
- study plan

STRICT JSON ONLY:

{{
  "detected_subjects": [],
  "marks_extracted": {{}},
  "strengths": [],
  "weaknesses": [],
  "study_plan": [],
  "suggested_courses": [],
  "parental_guidance": "",
  "student_guidance": "",
  "motivation": "",
  "follow_up_question": "Tell me honestly, why do you struggle to concentrate?"
}}

ANALYZE TEXT BELOW:
{text}
"""

    response = model.generate_content([prompt] if img is None else [prompt, img])
    cleaned = clean_text(response.text)
    return {"result": cleaned}


# ---------------------------
# STUDENT FOLLOW-UP ENDPOINT
# ---------------------------
@app.post("/student-response")
async def student_response(request: Request):
    data = await request.json()
    complaint = data.get("complaint", "")

    followup_prompt = f"""
The student said about concentration: "{complaint}"

Give:
- What mistake the student is doing
- How to fix their focus
- 5 simple habits
- Emotional support
- Motivation to be a better human being

STRICT JSON ONLY:

{{
  "analysis": "",
  "advice": "",
  "habits": [""],
  "motivation": ""
}}
"""

    reply = model.generate_content(followup_prompt)
    cleaned = clean_text(reply.text)
    return {"result": cleaned}


# ---------------------------
# FRIENDLY CHATBOT (POPUP)
# ---------------------------
@app.post("/chatbot")
async def chatbot(request: Request):
    data = await request.json()
    msg = (data.get("message") or "").strip()

    # If first time, send opening line
    if msg == "":
        return {
            "reply": "Hi da💛, Eppdi irukka?"
        }

    chatbot_prompt = f"""
You are a friendly Chennai-local Tamil/Tanglish chatbot.
You speak in Tanglish (Tamil words typed in English letters).
You must ALWAYS be:
- caring
- polite and not too much 
- no bad words EVER
- supportive
- short replies (2–5 lines)
- cute emojis (💛💙✨)
- ask questions back to keep convo going for consoling the student
- dont be too formal, be casual and friendly 
- use local slang
- light humor and fun
- little teasing is okay but keep it kind
- comforting
- understanding
- be like a close friend
- get them to open up more
- be little rude sometimes but in a funny way
- dont talk too much and dont give long replies, keep it short and sweet
- advise only when asked
- mainly advise parents, not the student if the parents are involved and pressuring the student too much
- if the student was so lethargic, be rude to them a bit to wake them up but keep it kind

Rules:
- Never insult.
- No adult content.
- No negativity.
- No overly formal language.
- No Shakespearean English.
- No Degrade anyone.
- No overly technical words.
- No formal English.
- Use local soft slang like "da", "dei", "macha", "sollu da", "seri", "parava illa" BUT keep it kind.
- NO harmful words (strict).

User said: "{msg}"

Now reply in sweet, kind Tanglish.
"""

    response = model.generate_content(chatbot_prompt)
    cleaned = clean_text(response.text)
    return {"reply": cleaned}
