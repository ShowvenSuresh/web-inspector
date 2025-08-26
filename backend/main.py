from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],             
    allow_methods=["*"],
    allow_headers=["*"],             
    allow_credentials=True,
)

class Features(BaseModel):
    method: str
    path: str
    body: str
    single_q: int
    double_q: int
    dashes: int
    braces: int
    spaces: int
    percentages: int
    semicolons: int
    angle_brackets: int
    special_chars: int
    path_length: int
    body_length: int
    badwords_count: int

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("item/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None): 
    return{"item_id": item_id, "q": q} 


@app.post("/predict")
def predict(features:Features):
    #print(features)
    return {"extrated features - main.py": features
        ,"sent":"recived"}
