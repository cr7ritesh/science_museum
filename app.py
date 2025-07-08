import os
import logging
import requests
import json
import time
from flask import Flask, render_template, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

@app.route('/')
def index():
    """Main page that displays the museum photograph interface."""
    return render_template('index.html')



def process_museum_item(item):
    """Process a single museum item to extract title, image, and description."""
    try:
        # Extract title
        title = ''
        if (item.get('attributes') and 
            item['attributes'].get('summary') and 
            item['attributes']['summary'].get('title')):
            title = item['attributes']['summary']['title']
        
        # Extract image URL
        image_url = None
        if (item.get('attributes') and 
            item['attributes'].get('multimedia') and 
            isinstance(item['attributes']['multimedia'], list)):
            
            for media in item['attributes']['multimedia']:
                if (media.get('@processed') and 
                    media['@processed'].get('large_thumbnail') and 
                    media['@processed']['large_thumbnail'].get('location')):
                    
                    image_url = media['@processed']['large_thumbnail']['location']
                    # Prepend base URL if needed
                    if not image_url.startswith('http'):
                        image_url = 'https://coimages.sciencemuseumgroup.org.uk/' + image_url
                    break
        
        # Extract description
        description = ''
        if (item.get('attributes') and 
            item['attributes'].get('description') and 
            isinstance(item['attributes']['description'], list) and 
            len(item['attributes']['description']) > 0 and 
            item['attributes']['description'][0].get('value')):
            description = item['attributes']['description'][0]['value']
        
        # Only return if we have all required fields
        if title and image_url and description:
            # Count words in description
            word_count = len(description.strip().split())
            
            return {
                'title': title,
                'image_url': image_url,
                'description': description,
                'word_count': word_count,
                'meets_criteria': word_count >= 30
            }
        
        return None
        
    except Exception as e:
        logging.error(f"Error processing museum item: {e}")
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
