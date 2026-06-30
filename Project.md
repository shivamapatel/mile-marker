## **Mile Marker**

### **TLDR for Agents**

* Mile Marker is a private, post-run reflection journal. Strava is the trigger and run data source, but the product is about capturing private thoughts quickly after a run

* Current milestones should be implemented narrowly. Do not add features from v2 unless explicitly requested

* V1 excludes: voice, SMS, native mobile app, LLM summaries, weather, posting to Strava, social sharing, coaching, training analytics, and billing. 

### **Product Spec**

***Product One-Liner***  
A private, post-run reflection journal that uses Strava activity completion as the trigger to capture thoughts before they fade.

***Problem***  
I often have useful reflections, ideas, or the rare emotional clarity we spend our days seeking after I run. Yet, I rarely capture these insights afterward. Capturing them in Strava is too public, so it is not the right place for private thoughts. It is a lot of work to write in my notebook after a run too.

***Target User***  
For version 1, me: a runner who saves runs to Strava immediately and wants a private place to capture post-run thoughts. In the future, other runners (or walkers or cyclists) whose best thinking happens during movement and who want private reflection capture. 

***Initial v1 Goal***  
Within 60 seconds of finishing and saving a run, I should be able to capture a private reflection associated with that run. 

***Core Product Flow***

1. User finishes a run  
2. User saves run to Strava  
3. App detects new Strava activity   
4. App surfaces the run as “uncaptured”   
5. User opens reflection form associated with the run  
6. User answers “fast-mode” fields (e.g., feeling selector, energy level, topic)  
7. User optionally adds a deeper note   
8. App saves reflection alongside run metadata (for future querying and analytical needs)   
9. User can browse previous runs and reflections 

***Success Criteria***

* V1 is done when I can go on a run, get an in-app uncaptured run prompt, fill out a reflection associated with the run, save it and later review it   
* V1 is successful if over my next 10 strava runs, I capture reflections for at least 7 of them within 10 minutes of finishing  
* V1 is successful if reviewing those reflections helps me identify at least 3 recurring themes, ideas, emotional patterns 

### **Version 1 Scope**

***v1 Requirements*** 

* **Authentication**  
  * User can sign-in   
  * Each user’s data is private   
  * All activities/reflections have a user\_id tagged to them  
* **Strava Integration**  
  * User can connect their Strava   
  * App can fetch recent activities, **and** their associated metadata that Strava makes available  
  * App can manually sync recent activities   
  * App can detect new activity via Strava webhook  
  * App can surface newly detected activities as “uncaptured” in app  
* **Reflection Capture**  
  * User can add mood/feeling, energy level, and primary topic (fast-mode) associated with the activity   
  * User can enter a note associated with the activity for more detail  
  * User can manually label route (and see all previous labels to select from)   
* **Feed/Browsing**  
  * User can see recent activities and their past reflections  
  * User can see which activities do not yet have reflections

***Out-of-scope***  
For v1, the following capabilities / features are out of scope: 

* Voice capture and transcription of reflections  
* SMS capabilities   
* Native mobile application  
* No LLM summaries or analysis of reflections over time   
* No posting back to Strava   
* No social sharing  
* No training analytics, coaching, performance recommendations  
* No billing  
* No multi-user hosted onboarding, open-source documentation or self-hosting setup

***Data model*** 

Rough concept below, not perfect

| Area | Requirements |
| :---- | :---- |
| User | Id Email |
| Strava Connection | User id  Access token Refresh token  Expires at  |
| Activity *(dependent on what Strava API lets us pull*) | User id  Strava activity id  Name Sport type Start time Distance Moving time Average pace Route label Strava url	 Raw strava json Synced\_at Created\_at updated\_at |
| Reflection | User\_id Activity id  Mood / feeling Energy Primary topic Secondary topics Note\_text Captured\_at  updated\_at |

***UX Principles***

Guiding principles:

* Capture must feel fast after a run   
* Mobile first  
* Private by default, no social mechanics  
* Avoid performance obsession  
* Reflection \> analytics  
* The app should feel calm, not gamified 

***Future Direction***

Mile Marker is being built first as a private personal tool; however the project should be structured so it could eventually support either: 

1. Self-hosted, open-source use, where each user runs their own instance / connects their own Strava account  
2. Multi-user hosted use, where multiple users can sign-in, connect Strava, and keep their activities/reflections private

This is not part of v1 scope, but v1 tech decisions should avoid blocking it. Specifically: 

* All user owned tables should include user\_id  
* Strava tokens should be stored per user  
* Reflections/activities are private by default  
* App should avoid hardcoding a single user  
* Environment variables should be used for secrets  
* Repo should eventually include setup instructions for self-hosting

### **Build Milestones**

***Build Order (directional)***

1. Mock UI with fake Strava activities  
2. Supabase auth \+ database  
3. Reflection form persistence  
4. Strava OAuth  
5. Manual sync recent activities  
6. Webhook detection  
7. In-app uncaptured run prompt

