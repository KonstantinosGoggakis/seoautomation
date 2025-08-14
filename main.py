#This code creates an API that can interact with WordPress sites
# to improve content using the capabilities of OpenAI and other libraries.

import os
import requests
import json
import nltk
import spacy
from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain_openai import OpenAI
from nltk.tokenize import sent_tokenize
from concurrent.futures import ThreadPoolExecutor

# Setup
nltk.download("punkt")
load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OpenAI API key is missing in .env file.")
os.environ["OPENAI_API_KEY"] = openai_api_key
llm = OpenAI(api_key=openai_api_key)

nlp = spacy.load("en_core_web_md")

app = Flask(__name__)
CORS(app)

#functionality communication with wp
def wp_get(url, user, pwd, **kwargs):
    return requests.get(url, auth=(user, pwd), **kwargs)

def fetch_pages_from_wp(site_url, username, app_password):
    api_url = f"{site_url}/wp-json/wp/v2/pages"
    all_pages = []
    page = 1

    while True:
        response = wp_get(api_url, username, app_password, params={"per_page": 100, "page": page})
        if response.status_code == 200:
            pages = response.json()
            if not pages:
                break
            all_pages.extend([
                {"id": str(p['id']), "title": p['title']['rendered']}
                for p in pages
            ])
            page += 1
        else:
            print(f"Failed to fetch pages: {response.status_code} - {response.text}")
            break

    return all_pages if all_pages else None

# OpenAI functionality for analyze and improve content
def rewrite_sentence(sentence):
    #Rewrite the content based on the command that prompt have
    prompt = (
        f"As an SEO expert, rewrite the following sentence to improve its chances of ranking higher in "
        f"search engine results, while keeping the original meaning and tone intact. Use natural language, "
        f"improve clarity, and incorporate relevant keywords only if appropriate.\n\n\"{sentence}\""
    )
    try:
        result = llm.invoke(prompt)
        if result:
            rewritten = result.strip().split("\n")[0]
            return rewritten if rewritten and rewritten != sentence else None
    except Exception as e:
        print(f"Error rewriting sentence: {e}")
    return None

import re

def extract_visible_sentences(html_content):
    # Remove shortcodes like [vc_row] or [vc_column_text]
    clean_content = re.sub(r'\[/?[a-zA-Z0-9_]+.*?\]', '', html_content)
    
    # Continue with normal parsing
    soup = BeautifulSoup(clean_content, "html.parser")
    text = soup.get_text(separator=" ")
    sentences = sent_tokenize(text)
    
    # Only return sentences with meaningful length
    return [s.strip() for s in sentences if len(s.split()) > 4]

#Routes/Endpoints

#Receive credentials & return "dynamic" available pages id
@app.route('/api/pages', methods=['POST'])

def get_available_pages():
    site_url = request.json.get('siteUrl')
    username = request.json.get('username')
    app_password = request.json.get('appPassword')

    if not site_url or not username or not app_password:
        return jsonify({"error": "Missing credentials."}), 400

    page_ids = fetch_pages_from_wp(site_url, username, app_password)
    if page_ids:
        return jsonify({"pageIds": page_ids})
    else:
        return jsonify({"error": "Failed to fetch page IDs."}), 500

#Receive html content extract sentences & use AI to rewrite
@app.route('/api/fetch', methods=['POST'])

def handle_fetch_request():
    data = request.json
    page_id = data.get('pageId')
    site_url = data.get('siteUrl')
    username = data.get('username')
    app_password = data.get('appPassword')

    if not all([username, app_password, site_url, page_id]):
        return jsonify({"error": "Missing required credentials or site URL."}), 400

    api_url = f"{site_url}/wp-json/wp/v2/pages/{page_id}"
    response = wp_get(api_url, username, app_password)

    if response.status_code != 200:
        return jsonify({"error": f"Failed to fetch content. {response.status_code}: {response.text}"}), 500

    content_json = response.json()
    html = content_json.get("content", {}).get("rendered", "")
    if not html:
        return jsonify({"error": "No valid HTML content found."}), 500

    sentences = extract_visible_sentences(html)

    rewritten_map = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(rewrite_sentence, sentences[:10])
        for orig, new in zip(sentences[:10], results):
            if new:
                rewritten_map[orig] = new

    return jsonify({"rewritten": rewritten_map})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
